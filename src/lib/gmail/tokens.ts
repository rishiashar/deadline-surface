/**
 * OAuth token storage + authorized client (FINAL-PLAN §4 week 1–2, §9.4).
 *
 * SCAFFOLD/TEST storage: tokens are written to a gitignored local file so a
 * single tester can connect their own inbox during the read-only test. This is
 * NOT a production token store — retention/encryption is a §9.4 decision. We
 * persist only OAuth tokens here, never raw email.
 */

import { promises as fs } from "fs";
import path from "path";
import { google } from "googleapis";
import type { Credentials } from "google-auth-library";
import { readAuthConfig, type GoogleAuthClient } from "./client";

const DATA_DIR = path.join(process.cwd(), ".data");
const TOKEN_PATH =
  process.env.GMAIL_TOKEN_PATH ?? path.join(DATA_DIR, "gmail-tokens.json");

/** Build a bare OAuth2 client from env config, or null if unconfigured. */
export function makeOAuth2Client(): GoogleAuthClient | null {
  const config = readAuthConfig();
  if (!config) return null;
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );
}

export async function saveTokens(tokens: Credentials): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  // Owner-only perms — these are credentials.
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), {
    mode: 0o600,
  });
}

export async function loadTokens(): Promise<Credentials | null> {
  try {
    const raw = await fs.readFile(TOKEN_PATH, "utf-8");
    return JSON.parse(raw) as Credentials;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await fs.rm(TOKEN_PATH, { force: true });
}

/**
 * Return an OAuth2 client with stored credentials applied, or null if either
 * the app isn't configured or no tokens have been stored yet. Persists tokens
 * again on refresh so the access token stays valid across requests.
 */
export async function getAuthorizedClient(): Promise<GoogleAuthClient | null> {
  const client = makeOAuth2Client();
  if (!client) return null;
  const tokens = await loadTokens();
  if (!tokens) return null;
  client.setCredentials(tokens);
  client.on("tokens", (fresh) => {
    // Merge so we don't drop the refresh token (Google only sends it once).
    void saveTokens({ ...tokens, ...fresh });
  });
  return client;
}
