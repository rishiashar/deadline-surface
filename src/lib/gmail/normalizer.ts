/**
 * Normalizer (FINAL-PLAN §5): raw Gmail → internal Message.
 *
 * This is the ONLY place that knows the Gmail wire format. Surfaces and
 * extraction read the internal model, so a Gmail API change is contained here
 * ("interface rot" mitigation, §2).
 */

import type { Message, Person, RoleGuess } from "@/lib/model";
import type { RawGmailMessage } from "./client";

/** Heuristic role guess from an email address — refined later by the model. */
export function guessRole(email: string, name: string): RoleGuess {
  const e = email.toLowerCase();
  const n = name.toLowerCase();
  if (/(no-?reply|forms|notification)/.test(e)) return "admin";
  if (/(prof|faculty|dr\.)/.test(n) || /\.edu$/.test(e)) return "professor";
  if (/\bta\b|teaching assistant/.test(n)) return "ta";
  if (/club|society|union|events?/.test(e) || /club|society/.test(n)) return "club";
  return "unknown";
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPayload {
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailPayload[];
}

function header(payload: GmailPayload | undefined, name: string): string {
  const h = payload?.headers?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

/** Parse "Jane Prof <jane@uni.edu>" → {name, email}. */
export function parseFrom(raw: string): { name: string; email: string } {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].replace(/(^"|"$)/g, "").trim(), email: match[2].trim() };
  return { name: raw.trim(), email: raw.trim() };
}

/** Recursively collect text/plain body, base64url-decoded. */
function extractBody(payload: GmailPayload | undefined): string {
  if (!payload) return "";
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  for (const part of payload.parts ?? []) {
    const text = extractBody(part);
    if (text) return text;
  }
  return "";
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

export function normalizeMessage(raw: RawGmailMessage): Message {
  const payload = (raw.payload ?? {}) as GmailPayload;
  const fromRaw = header(payload, "From");
  const { name, email } = parseFrom(fromRaw);
  const person: Person = { email, name, role_guess: guessRole(email, name) };
  const dateMs = raw.internalDate ? Number(raw.internalDate) : Date.now();
  return {
    id: raw.id,
    thread: raw.threadId,
    from: person,
    subject: header(payload, "Subject"),
    body: extractBody(payload) || raw.snippet || "",
    date: new Date(dateMs).toISOString(),
    labels: raw.labelIds ?? [],
  };
}

export function normalizeAll(raws: RawGmailMessage[]): Message[] {
  return raws.map(normalizeMessage);
}
