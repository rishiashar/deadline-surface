import { NextResponse } from "next/server";
import { makeOAuth2Client, saveTokens } from "@/lib/gmail/tokens";

/**
 * OAuth callback (§4 week 1–2).
 *
 * Exchanges the authorization `code` for tokens and persists them (scaffold
 * local store — §9.4 covers production retention). Read-only test flow: we
 * store only OAuth tokens, never raw email. On success, redirect home where
 * the live surface renders from the connected inbox.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/?gmail_error=${encodeURIComponent(oauthError)}`);
  }
  if (!code) {
    return NextResponse.json({ error: "Missing authorization code." }, { status: 400 });
  }

  const client = makeOAuth2Client();
  if (!client) {
    return NextResponse.json(
      {
        error: "Gmail OAuth not configured.",
        hint: "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.",
      },
      { status: 501 },
    );
  }

  try {
    const { tokens } = await client.getToken(code);
    await saveTokens(tokens);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange failed.";
    return NextResponse.redirect(`${origin}/?gmail_error=${encodeURIComponent(message)}`);
  }

  return NextResponse.redirect(`${origin}/?connected=1`);
}
