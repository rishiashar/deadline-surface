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

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

/** Category cue words → category + base confidence. Order = priority. */
const CATEGORY_CUES: { re: RegExp; category: Category; base: Confidence }[] = [
  { re: /\b(final|midterm|exam|test)\b/i, category: "exam", base: 0.8 },
  { re: /\b(assignment|homework|hw|problem set|pset|project|lab|essay|paper|submit by|due)\b/i, category: "assignment", base: 0.7 },
  { re: /\b(form|survey|questionnaire|sign[- ]?up|register|registration)\b/i, category: "form", base: 0.65 },
  { re: /\b(rsvp|invite|invitation|event|meetup|workshop|seminar)\b/i, category: "rsvp", base: 0.6 },
  { re: /\b(fee|payment|tuition|invoice|balance due|pay by)\b/i, category: "fee", base: 0.7 },
];

interface FoundDate {
  iso: string;
  numeric: boolean;
}

interface Classified {
  category: Category;
  base: Confidence;
  re: RegExp;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, Number(n.toFixed(2))));
}

/** Find the first plausible absolute date in text, anchored to the email date. */
function findDate(text: string, anchorIso: string): FoundDate | null {
  const anchor = new Date(anchorIso);

  // "Month Day" (optionally with year): "March 14", "Mar 14, 2026"
  const monthDay = text.match(
    /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?\b/i,
  );
  if (monthDay) {
    const month = MONTHS[monthDay[1].toLowerCase()];
    const day = Number(monthDay[2]);
    let year = monthDay[3] ? Number(monthDay[3]) : anchor.getUTCFullYear();
    const candidate = new Date(Date.UTC(year, month, day, 23, 59));
    if (!monthDay[3] && candidate.getTime() < anchor.getTime()) year += 1;
    return { iso: new Date(Date.UTC(year, month, day, 23, 59)).toISOString(), numeric: false };
  }

  // Numeric: MM/DD or MM/DD/YYYY
  const numeric = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numeric) {
    const month = Number(numeric[1]) - 1;
    const day = Number(numeric[2]);
    let year = numeric[3] ? Number(numeric[3]) : anchor.getUTCFullYear();
    if (year < 100) year += 2000;
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    return { iso: new Date(Date.UTC(year, month, day, 23, 59)).toISOString(), numeric: true };
  }

  return null;
}

function classify(text: string): Classified | null {
  for (const cue of CATEGORY_CUES) {
    if (cue.re.test(text)) return { category: cue.category, base: cue.base, re: cue.re };
  }
  return null;
}

function isEventCategory(category: Category): boolean {
  return category === "rsvp";
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
        const inSubject = cue.re.test(msg.subject);
        const confidence = clamp(cue.base + (inSubject ? 0.1 : 0) - (date.numeric ? 0.05 : 0));
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
