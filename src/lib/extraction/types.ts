/**
 * Extraction interface (FINAL-PLAN §4 week 3, §9.1).
 *
 * Extraction-first is the locked build sequence: prove this on real inboxes
 * BEFORE building the surface. The architecture (pure-LLM vs hybrid) is an open
 * question (§9.1, Codex leans hybrid: deterministic date/entity parser + LLM
 * for intent). Both implement this same interface so the eval can compare them.
 */

import type { Message, Deadline, Event, Action } from "@/lib/model";

export interface ExtractionResult {
  deadlines: Deadline[];
  events: Event[];
  /** Proposed actions (e.g. drafted replies) — always status "proposed". */
  actions: Action[];
}

export interface Extractor {
  readonly name: string;
  extract(messages: Message[]): Promise<ExtractionResult>;
}
