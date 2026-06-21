import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/gmail/tokens";

/**
 * Disconnect: drop the stored OAuth tokens (scaffold local store). Does not
 * revoke at Google — the tester can also remove access from their Google
 * Account's third-party apps page.
 */
export async function POST(request: Request) {
  await clearTokens();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/?disconnected=1`, { status: 303 });
}
