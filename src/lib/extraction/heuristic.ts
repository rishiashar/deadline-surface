/**
 * Heuristic (deterministic) extractor — the hybrid baseline (FINAL-PLAN §9.1).
 *
 * Pure date/entity parsing, no LLM. It is intentionally simple and cheap so it
 * can run inside the eval harness with zero credentials. In the hybrid design
 * (Codex's lean), this layer proposes candidate dates/categories and an LLM
 * later refines intent. Treat its accuracy as the FLOOR to beat.
 */

import type { Message, Deadline, Event, Action, Category, Confidence } from "@/lib/model";
import type { Extractor, ExtractionResult } from "./types";
import { assessNoise } from "./noise";
import { clamp, findDate, isEventCategory } from "./shared";

/** Category cue words → category + base confidence. Order = priority. */
const CATEGORY_CUES: { re: RegExp; category: Category; base: Confidence }[] = [
  { re: /\b(final|midterm|exam|test)\b/i, category: "exam", base: 0.8 },
  { re: /\b(assignment|homework|hw|problem set|pset|project|lab|essay|paper|submit by|due)\b/i, category: "assignment", base: 0.7 },
  { re: /\b(form|survey|questionnaire|sign[- ]?up|register|registration)\b/i, category: "form", base: 0.65 },
  { re: /\b(rsvp|invite|invitation|event|meetup|workshop|seminar)\b/i, category: "rsvp", base: 0.6 },
  { re: /\b(fee|payment|tuition|invoice|balance due|pay by)\b/i, category: "fee", base: 0.7 },
];

interface Classified {
  category: Category;
  base: Confidence;
  re: RegExp;
}

function classify(text: string): Classified | null {
  for (const cue of CATEGORY_CUES) {
    if (cue.re.test(text)) return { category: cue.category, base: cue.base, re: cue.re };
  }
  return null;
}

export class HeuristicExtractor implements Extractor {
  readonly name = "heuristic";

  async extract(messages: Message[]): Promise<ExtractionResult> {
    const deadlines: Deadline[] = [];
    const events: Event[] = [];
    const actions: Action[] = [];

    for (const msg of messages) {
      const haystack = `${msg.subject}\n${msg.body}`;
      const cue = classify(haystack);
      const date = findDate(haystack, msg.date);

      if (cue && date) {
        const noise = assessNoise(msg);
        // Precision (§7): drop clear promo/social/transactional noise so the
        // surface isn't flooded with "your free trial started" style mail.
        if (noise.suppress) continue;
        const inSubject = cue.re.test(msg.subject);
        const confidence = clamp(
          cue.base + (inSubject ? 0.1 : 0) - (date.numeric ? 0.05 : 0) - noise.penalty,
        );
        if (isEventCategory(cue.category)) {
          events.push({
            id: `ev_${msg.id}`,
            title: msg.subject || cue.category,
            starts_at: date.iso,
            source_msg_id: msg.id,
            confidence,
          });
        } else {
          deadlines.push({
            id: `dl_${msg.id}`,
            title: msg.subject || cue.category,
            due_at: date.iso,
            category: cue.category,
            source_msg_id: msg.id,
            confidence,
          });
        }
      }

      // "Needs a reply" → propose a drafted reply for professor threads.
      if (msg.from.role_guess === "professor" && /\?/.test(msg.body)) {
        actions.push({
          id: `act_${msg.id}`,
          type: "reply",
          status: "proposed",
          source_msg_id: msg.id,
          payload: {
            kind: "reply",
            thread: msg.thread,
            to: msg.from.email,
            subject: `Re: ${msg.subject}`,
            body: "",
          },
        });
      }
    }

    return { deadlines, events, actions };
  }
}
