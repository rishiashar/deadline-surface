import { NextResponse } from "next/server";
import type { Message } from "@/lib/model";
import { HeuristicExtractor } from "@/lib/extraction/heuristic";

/**
 * Run extraction over normalized messages → deadlines/events/proposed actions.
 *
 * Body: { messages: Message[] }. Uses the deterministic heuristic extractor
 * (no credentials). The LLM/hybrid extractor (`@/lib/extraction/llm`, §9.1)
 * now exists; wire the surface to it only after it clears the accuracy gate
 * (`EVAL_EXTRACTOR=llm npm run eval`, §7) — extraction-first, before the UI.
 */
export async function POST(request: Request) {
  let body: { messages?: Message[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Expected { messages: Message[] }." }, { status: 400 });
  }

  const result = await new HeuristicExtractor().extract(body.messages);
  return NextResponse.json(result);
}
