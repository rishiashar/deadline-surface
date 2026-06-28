/**
 * Shared deterministic primitives for the extractors (FINAL-PLAN §9.1).
 *
 * The hybrid design (Codex's lean) splits responsibility: deterministic code
 * GROUNDS the date (so the model can never hallucinate a due date — §6), and
 * the LLM judges INTENT. Both the heuristic baseline (heuristic.ts) and the
 * hybrid LLM extractor (llm.ts) read date parsing from here so there is exactly
 * one date grammar to reason about.
 */

import type { Message, Action, Category, Confidence } from "@/lib/model";

export const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

export interface FoundDate {
  iso: string;
  numeric: boolean;
}

/** Clamp a confidence into [0,1] with 2-decimal precision. */
export function clamp(n: number): number {
  return Math.max(0, Math.min(1, Number(n.toFixed(2))));
}

/** Categories that surface as Events (starts_at) rather than Deadlines (due_at). */
export function isEventCategory(category: Category): boolean {
  return category === "rsvp";
}

/** Find the first plausible absolute date in text, anchored to the email date. */
export function findDate(text: string, anchorIso: string): FoundDate | null {
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

/**
 * Propose a drafted reply for a professor thread that asks a question.
 * Deterministic and shared: "needs a reply" is not the precision problem the
 * LLM exists to fix, so both extractors derive it the same way. The draft body
 * is empty — it travels the trust rails (§6: preview → approve → undo) before
 * anything is sent.
 */
export function proposeReplyAction(msg: Message): Action | null {
  if (msg.from.role_guess === "professor" && /\?/.test(msg.body)) {
    return {
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
    };
  }
  return null;
}

export type { Confidence };
