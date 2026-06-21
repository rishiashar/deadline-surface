/**
 * LLM extractor — STUB (FINAL-PLAN §9.1, §9.4).
 *
 * The open architecture question (§9.1) is pure-LLM-per-email vs hybrid
 * (deterministic parser + LLM for intent). This seam is where the LLM call
 * lives. It is deliberately unimplemented so the scaffold runs with no API key
 * and so the privacy decision (§9.4 — what content is sent to the model, what's
 * stored, retention) is made explicitly before any email leaves the box.
 */

import type { Message } from "@/lib/model";
import type { Extractor, ExtractionResult } from "./types";

export interface LlmExtractorOptions {
  model?: string;
  /** §9.4: decide what is sent. Default sends subject + a truncated body. */
  bodyCharLimit?: number;
}

export class LlmExtractor implements Extractor {
  readonly name = "llm";
  constructor(private readonly options: LlmExtractorOptions = {}) {}

  async extract(_messages: Message[]): Promise<ExtractionResult> {
    void this.options;
    throw new Error(
      "LlmExtractor not implemented — scaffold stub. Resolve §9.1 (architecture) " +
        "and §9.4 (privacy: what content is sent/stored) before enabling.",
    );
  }
}
