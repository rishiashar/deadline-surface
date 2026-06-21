import { NextResponse } from "next/server";

/**
 * OAuth callback — STUB (§4 week 1–2).
 *
 * The real handler exchanges `code` for tokens, stores the refresh token, and
 * kicks off the historical backfill (lib/gmail/ingest.ts). Token storage and
 * retention are a §9.4 privacy decision — do not store raw email here.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing authorization code." }, { status: 400 });
  }
  return NextResponse.json(
    {
      error: "Token exchange not implemented — scaffold stub.",
      next: "Exchange code → tokens, persist refresh token, run historical backfill (FINAL-PLAN §4, §9.2, §9.4).",
    },
    { status: 501 },
  );
}
