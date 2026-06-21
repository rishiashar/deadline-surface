/**
 * Ingestion notes + helpers (FINAL-PLAN §4 week 1–2, §9.2).
 *
 * Live "observe inbox" requires Gmail push:
 *   - Pub/Sub topic + users.watch (a watch EXPIRES and must be renewed ≤7 days)
 *   - history.list to fetch deltas since the last historyId
 *   - a polling fallback for when push is delayed/dropped
 *
 * The offline eval (week 3) does NOT need any of this — it only needs a
 * historical pull (GmailClient.listHistorical). Keep the two paths separate so
 * the eval can run before push infrastructure exists.
 */

import type { GmailClient, RawGmailMessage } from "./client";
import { normalizeAll } from "./normalizer";
import type { Message } from "@/lib/model";

/** Gmail watch must be renewed at or before this interval. */
export const WATCH_RENEWAL_DAYS = 7;

/**
 * Historical backfill for the week-3 eval. Pulls raw messages and normalizes
 * them to the internal model. No push/watch required.
 */
export async function backfillHistorical(
  client: GmailClient,
  opts: { query?: string; max?: number } = {},
): Promise<Message[]> {
  const raws = await client.listHistorical(opts);
  return normalizeAll(raws);
}

/** Placeholder for the live delta path — implement with history.list + Pub/Sub. */
export async function applyHistoryDelta(
  _client: GmailClient,
  _startHistoryId: string,
): Promise<RawGmailMessage[]> {
  throw new Error(
    "Live delta ingestion not implemented — scaffold stub. " +
      "Implement Pub/Sub watch + history.list + polling fallback (FINAL-PLAN §9.2).",
  );
}
