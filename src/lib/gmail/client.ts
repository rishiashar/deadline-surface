/**
 * Gmail client — STUB (FINAL-PLAN §4 week 1–2).
 *
 * This is a thin, intentionally-unimplemented seam. The real client wires
 * Google OAuth (incremental, read-only first — see ./scopes.ts) and the Gmail
 * REST API. Everything downstream depends only on the interface below, so the
 * surface and extraction can be built and eval'd before the live client lands.
 */

import { google } from "googleapis";
import { DAY_ONE_SCOPES } from "./scopes";

/**
 * The concrete OAuth2 client type as produced by `google.auth.OAuth2`. Derived
 * here (rather than imported from google-auth-library) so it always matches the
 * copy googleapis resolves — npm can hoist two copies whose nominal types clash.
 */
export type GoogleAuthClient = InstanceType<typeof google.auth.OAuth2>;

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
 * Live read-only client over the Gmail REST API.
 *
 * Read-only by construction: it only calls users.messages.list/get. There is
 * no send/modify path here — write capability (compose) stays gated behind
 * COMPOSE_ENABLED elsewhere (FINAL-PLAN §2, §8). `auth` must carry the
 * `gmail.readonly` scope only (see DAY_ONE_SCOPES).
 */
export function createGmailClient(auth: GoogleAuthClient): GmailClient {
  const gmail = google.gmail({ version: "v1", auth });

  async function getMessage(id: string): Promise<RawGmailMessage> {
    const { data } = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });
    return {
      id: data.id ?? id,
      threadId: data.threadId ?? "",
      labelIds: data.labelIds ?? undefined,
      payload: data.payload ?? undefined,
      internalDate: data.internalDate ?? undefined,
      snippet: data.snippet ?? undefined,
    };
  }

  async function listHistorical(opts: {
    query?: string;
    max?: number;
  }): Promise<RawGmailMessage[]> {
    const max = opts.max ?? 50;
    const ids: string[] = [];
    let pageToken: string | undefined;

    while (ids.length < max) {
      const { data } = await gmail.users.messages.list({
        userId: "me",
        q: opts.query,
        maxResults: Math.min(100, max - ids.length),
        pageToken,
      });
      for (const m of data.messages ?? []) {
        if (m.id) ids.push(m.id);
      }
      pageToken = data.nextPageToken ?? undefined;
      if (!pageToken) break;
    }

    // Fetch full payloads sequentially-ish in small batches to stay polite.
    const out: RawGmailMessage[] = [];
    for (const id of ids.slice(0, max)) {
      out.push(await getMessage(id));
    }
    return out;
  }

  return { listHistorical, getMessage };
}
