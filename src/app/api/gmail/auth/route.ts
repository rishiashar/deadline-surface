import { NextResponse } from "next/server";
import { buildConsentUrl, readAuthConfig } from "@/lib/gmail/client";
import { DAY_ONE_SCOPES } from "@/lib/gmail/scopes";

/**
 * Start the day-one (read-only) Gmail consent flow (§4 week 1–2).
 * Incremental OAuth: write/compose scopes are requested later, at first use.
 */
export async function GET() {
  const config = readAuthConfig();
  if (!config) {
    return NextResponse.json(
      {
        error: "Gmail OAuth not configured.",
        hint: "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI. Day-one scopes are read-only.",
        dayOneScopes: DAY_ONE_SCOPES,
      },
      { status: 501 },
    );
  }
  const url = buildConsentUrl(config, DAY_ONE_SCOPES, crypto.randomUUID());
  // Redirect straight into Google's consent screen so a plain link works.
  return NextResponse.redirect(url);
}
