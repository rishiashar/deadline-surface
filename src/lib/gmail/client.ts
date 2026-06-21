/**
 * Gmail client — STUB (FINAL-PLAN §4 week 1–2).
 *
 * This is a thin, intentionally-unimplemented seam. The real client wires
 * Google OAuth (incremental, read-only first — see ./scopes.ts) and the Gmail
 * REST API. Everything downstream depends only on the interface below, so the
 * surface and extraction can be built and eval'd before the live client lands.
 */

import { DAY_ONE_SCOPES } from "./scopes";

export interface GmailAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Read config from env. Returns null if not configured (stub-friendly). */
export function readAuthConfig(): GmailAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

/**
 * Build the day-one (read-only) consent URL. `access_type=offline` +
 * `include_granted_scopes=true` enables incremental OAuth — later scopes are
 * layered on without re-consenting to read.
 */
export function buildConsentUrl(
  config: GmailAuthConfig,
  scopes: readonly string[] = DAY_ONE_SCOPES,
  state: string = "",
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    scope: scopes.join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** A raw Gmail message, as returned by users.messages.get (subset). */
export interface RawGmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  payload?: unknown;
  internalDate?: string;
  snippet?: string;
}

export interface GmailClient {
  /** Historical pull for the offline eval (§4 week 3 only needs this). */
  listHistorical(opts: { query?: string; max?: number }): Promise<RawGmailMessage[]>;
  getMessage(id: string): Promise<RawGmailMessage>;
}

/**
 * Live client — not implemented in the scaffold.
 * Implement against googleapis once OAuth + CASA path are confirmed (§9.3).
 */
export function createGmailClient(_accessToken: string): GmailClient {
  throw new Error(
    "GmailClient not implemented — scaffold stub. " +
      "Wire googleapis here once OAuth + CASA path are confirmed (FINAL-PLAN §9.3).",
  );
}
