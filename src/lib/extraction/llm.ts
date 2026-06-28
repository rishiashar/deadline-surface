/**
 * Hybrid extractor: deterministic dates + LLM intent (FINAL-PLAN §9.1, §9.4).
 *
 * The precision problem (BUILD-PLAN §1): the deterministic extractor finds a
 * date + a category cue and over-fires — on a year of real mail it tagged
 * LinkedIn/receipt/promo email as "overdue assignments." Rules alone (noise.ts)
 * catch the obvious cases; the ambiguous middle ("your assignment is due
 * Thursday" vs "your free trial started") needs intent understanding.
 *
 * Architecture decision (§9.1, Codex's lean — hybrid):
 *   1. Deterministic layer GROUNDS the date (findDate). The model never invents
 *      a due date, which closes the hallucinated-date edge case (§6).
 *   2. Rules PRE-FILTER obvious bulk/promo (assessNoise) before any API call —
 *      cheap noise removal, and the model only judges what's left.
 *   3. The LLM judges INTENT: is this a genuine student deadline/event, and of
 *      which category? This is the precision fix.
 *
 * Privacy (§9.4): only the subject + a truncated body + the parsed candidate
 * date leave the box — never the full message, never attachments. Tune what is
 * sent with `bodyCharLimit`. Runs only when ANTHROPIC_API_KEY is set; the
 * heuristic baseline remains the zero-credential default for the eval.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Message, Deadline, Event, Action, Category } from "@/lib/model";
import type { Extractor, ExtractionResult } from "./types";
import { assessNoise } from "./noise";
import { clamp, findDate, isEventCategory, proposeReplyAction } from "./shared";

/** Cheap, fast per-message classifier by default (§9.5 per-user LLM cost). */
const DEFAULT_MODEL = "claude-haiku-4-5";
const DEFAULT_BODY_CHAR_LIMIT = 1000;

export interface LlmExtractorOptions {
  /** Override the classifier model. Default: claude-haiku-4-5. */
  model?: string;
  /** §9.4: how many body characters are sent to the model. Default 1000. */
  bodyCharLimit?: number;
  /** Inject a client for testing; otherwise constructed from ANTHROPIC_API_KEY. */
  client?: Anthropic;
}

/** The five gated categories plus "none" — the model's reject-as-noise verdict. */
type Verdict = Category | "none";

interface Classification {
  category: Verdict;
  confidence: number;
  title: string;
  reason: string;
}

const SYSTEM_PROMPT = `You triage a student's email to decide whether it contains a GENUINE, actionable academic deadline or event — the kind a student must not miss.

A date parser has already found a candidate date in the email. Your only job is intent: does this email actually impose a deadline/event on the student, and if so, of what category?

Categories:
- exam: a scheduled exam, midterm, final, or test.
- assignment: homework, a project, lab, essay, or problem set the student must submit.
- form: a form, survey, or registration the student must complete.
- fee: tuition, a fee, or a payment the student must make.
- rsvp: a club/campus event, workshop, or invitation to RSVP or attend.
- none: NOT a real student deadline. Use this for promotional, marketing, social, or transactional mail that merely mentions a date — e.g. "your free trial started", "50% off ends soon", "X posted on LinkedIn", receipts, newsletters, terms-of-service updates. When in doubt between a real deadline and marketing noise, prefer "none".

Precision matters more than recall here: a false "assignment" deadline from a promo email erodes trust far more than missing a borderline event. Be strict.

confidence is your certainty in [0,1] that this is a real deadline/event of the chosen category (use a low value, and prefer "none", for anything that smells like marketing). title is a short human-readable label (you may reuse the subject). reason is one short sentence.`;

function buildClient(options: LlmExtractorOptions): Anthropic {
  if (options.client) return options.client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "LlmExtractor requires ANTHROPIC_API_KEY. The heuristic extractor runs " +
        "with zero credentials; set the key to run the hybrid LLM path " +
        "(e.g. EVAL_EXTRACTOR=llm npm run eval).",
    );
  }
  return new Anthropic();
}

const CLASSIFY_TOOL: Anthropic.Tool = {
  name: "classify_email",
  description: "Record the deadline/event classification for this email.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["exam", "assignment", "form", "fee", "rsvp", "none"],
        description: "The category, or 'none' if this is not a real student deadline/event.",
      },
      confidence: {
        type: "number",
        description: "Certainty in [0,1] that this is a genuine deadline/event of that category.",
      },
      title: { type: "string", description: "Short human-readable title." },
      reason: { type: "string", description: "One short sentence explaining the verdict." },
    },
    required: ["category", "confidence", "title", "reason"],
  },
};

export class LlmExtractor implements Extractor {
  readonly name = "llm";
  private readonly model: string;
  private readonly bodyCharLimit: number;
  private readonly client: Anthropic;

  constructor(options: LlmExtractorOptions = {}) {
    this.model = options.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
    this.bodyCharLimit = options.bodyCharLimit ?? DEFAULT_BODY_CHAR_LIMIT;
    this.client = buildClient(options);
  }

  private async classify(msg: Message, candidateIso: string): Promise<Classification | null> {
    const body = msg.body.slice(0, this.bodyCharLimit);
    const userContent =
      `From: ${msg.from.name} <${msg.from.email}> (role: ${msg.from.role_guess})\n` +
      `Subject: ${msg.subject}\n` +
      `Received: ${msg.date}\n` +
      `Candidate date found by the parser: ${candidateIso}\n\n` +
      `Body (truncated):\n${body}`;

    // Sampling params are removed on Opus 4.7+/Fable (400). Haiku/Sonnet accept
    // temperature; send 0 there for a repeatable eval, omit it elsewhere.
    const deterministic = !/opus-4-(7|8)|fable|mythos/i.test(this.model);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      ...(deterministic ? { temperature: 0 } : {}),
      system: SYSTEM_PROMPT,
      tools: [CLASSIFY_TOOL],
      tool_choice: { type: "tool", name: CLASSIFY_TOOL.name },
      messages: [{ role: "user", content: userContent }],
    });

    if (response.stop_reason === "refusal") return null;
    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) return null;

    const input = toolUse.input as Partial<Classification>;
    if (typeof input.category !== "string") return null;
    return {
      category: input.category as Verdict,
      confidence: clamp(typeof input.confidence === "number" ? input.confidence : 0),
      title: typeof input.title === "string" && input.title ? input.title : msg.subject,
      reason: typeof input.reason === "string" ? input.reason : "",
    };
  }

  async extract(messages: Message[]): Promise<ExtractionResult> {
    const deadlines: Deadline[] = [];
    const events: Event[] = [];
    const actions: Action[] = [];

    for (const msg of messages) {
      const haystack = `${msg.subject}\n${msg.body}`;
      const date = findDate(haystack, msg.date);

      // A dated deadline needs a date. No date → nothing for the model to judge.
      if (date) {
        // Rules pre-filter: skip the API call for clear bulk/promo noise (§7).
        const noise = assessNoise(msg);
        if (!noise.suppress) {
          const verdict = await this.classify(msg, date.iso);
          if (verdict && verdict.category !== "none") {
            const category = verdict.category;
            if (isEventCategory(category)) {
              events.push({
                id: `ev_${msg.id}`,
                title: verdict.title,
                starts_at: date.iso,
                source_msg_id: msg.id,
                confidence: verdict.confidence,
              });
            } else {
              deadlines.push({
                id: `dl_${msg.id}`,
                title: verdict.title,
                due_at: date.iso,
                category,
                source_msg_id: msg.id,
                confidence: verdict.confidence,
              });
            }
          }
        }
      }

      const reply = proposeReplyAction(msg);
      if (reply) actions.push(reply);
    }

    return { deadlines, events, actions };
  }
}
