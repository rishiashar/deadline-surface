/**
 * Live model assembly (FINAL-PLAN §4, §5).
 *
 * Connected read-only path: pull historical messages → normalize to the
 * internal model → run the extractor → assemble an InboxModel the surface can
 * render. Same substrate the eval and the sample surface use, so nothing
 * downstream knows whether the data came from a fixture or a live inbox.
 */

import type { InboxModel, Message, Person } from "@/lib/model";
import { LlmExtractor } from "@/lib/extraction/llm";
import { createGmailClient } from "./client";
import { backfillHistorical } from "./ingest";
import { getAuthorizedClient } from "./tokens";

export interface LiveModelOptions {
  /** Gmail search query, e.g. "newer_than:30d". */
  query?: string;
  /** Max messages to pull. */
  max?: number;
}

/** Dedupe people from messages (provenance for "Needs a reply"). */
function peopleFrom(messages: Message[]): Person[] {
  const byEmail = new Map<string, Person>();
  for (const m of messages) {
    if (!byEmail.has(m.from.email)) byEmail.set(m.from.email, m.from);
  }
  return [...byEmail.values()];
}

/**
 * Build an InboxModel from the connected inbox, or null if Gmail isn't
 * connected/configured (caller falls back to the sample model).
 */
export async function buildLiveModel(
  opts: LiveModelOptions = {},
): Promise<InboxModel | null> {
  const auth = await getAuthorizedClient();
  if (!auth) return null;

  const client = createGmailClient(auth);
  const messages = await backfillHistorical(client, {
    query: opts.query ?? "newer_than:1y",
    max: opts.max ?? 200,
  });

  // Hybrid extractor: deterministic dates + LLM intent (validated by the gate —
  // see the precision fix in eval/). Needs ANTHROPIC_API_KEY (loaded from
  // .env.local). The heuristic remains the zero-credential default elsewhere.
  const { deadlines, events, actions } = await new LlmExtractor().extract(
    messages,
  );

  return {
    messages,
    people: peopleFrom(messages),
    deadlines,
    events,
    actions,
  };
}
