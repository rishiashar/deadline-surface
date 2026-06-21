/**
 * Rules-only precision filter (FINAL-PLAN §7).
 *
 * The deterministic extractor finds a date + a category cue, but on real mail
 * that over-fires: promo, social, and transactional notifications ("your free
 * trial started", "50% off ends soon", "X posted") contain dates and cue words
 * yet are NOT student deadlines. This module scores that noise so the extractor
 * can suppress or down-weight it — lifting precision without an LLM.
 *
 * It is intentionally separate from the extractor so the future LLM/hybrid
 * intent classifier (§9.1) can reuse or replace it behind the same seam.
 */

import type { Message } from "@/lib/model";

/** Gmail category labels that mark non-actionable bulk mail. */
const PROMO_LABELS = new Set(["CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL", "CATEGORY_FORUMS", "SPAM"]);

/** Local-parts typical of automated bulk/marketing senders. */
const BULK_SENDER_RE =
  /\b(no-?reply|do-?not-?reply|notifications?|marketing|newsletter|news|updates?|hello|team|deals?|offers?|mailer|notify|alerts?|billing|receipts?)@/i;

/** Phrases that strongly indicate promo / social / transactional noise. */
const NOISE_PHRASES: RegExp[] = [
  /\bunsubscribe\b/i,
  /view (this email )?in (your )?browser/i,
  /\b\d{1,3}%\s*(off|discount)\b/i,
  /\b(sale|deal|coupon|promo(tion)?)\b/i,
  /\b(receipt|invoice number|order (confirmation|number)|your order|payment received)\b/i,
  /\b(free )?trial\b/i,
  /\b(webinar|newsletter)\b/i,
  /\b(posted|commented|shared a post|liked your|mentioned you|new connection|invitation to connect|wants to connect|viewed your profile)\b/i,
  /\bterms (of service|and conditions|and data use)\b/i,
  /\bprivacy (policy|notice)\b/i,
  /\bmanage (your )?(preferences|subscription)\b/i,
  /\b(black friday|cyber monday|flash sale|limited time)\b/i,
];

/** First-party school / instructor signals that should resist the noise filter. */
function isAcademicSource(msg: Message): boolean {
  const email = msg.from.email.toLowerCase();
  if (msg.from.role_guess === "professor" || msg.from.role_guess === "ta") return true;
  if (/\.edu\b/.test(email) || /\.ac\.[a-z]{2}\b/.test(email)) return true;
  return false;
}

export interface NoiseAssessment {
  /** True → do not surface a deadline at all (clear bulk/promo noise). */
  suppress: boolean;
  /** Confidence penalty to subtract when not hard-suppressed. */
  penalty: number;
  /** Human-readable signals that fired (debugging / future provenance). */
  reasons: string[];
}

export function assessNoise(msg: Message): NoiseAssessment {
  const reasons: string[] = [];
  const haystack = `${msg.subject}\n${msg.body}`;
  const academic = isAcademicSource(msg);

  const promoLabel = msg.labels.some((l) => PROMO_LABELS.has(l));
  if (promoLabel) reasons.push("gmail-promo-label");

  const bulkSender = BULK_SENDER_RE.test(msg.from.email);
  if (bulkSender) reasons.push("bulk-sender");

  const phraseHits = NOISE_PHRASES.filter((re) => re.test(haystack)).length;
  if (phraseHits > 0) reasons.push(`noise-phrases:${phraseHits}`);

  // Hard-suppress clear bulk/promotional mail from a non-academic source.
  // A Gmail promo/social label, or a bulk sender paired with a noise phrase,
  // or multiple noise phrases is essentially never a real student deadline.
  if (!academic && (promoLabel || (bulkSender && phraseHits >= 1) || phraseHits >= 2)) {
    return { suppress: true, penalty: 1, reasons };
  }

  // Otherwise apply a soft penalty that pushes borderline items toward the
  // "confirm?" bucket rather than silently dropping them (§6).
  let penalty = 0;
  if (bulkSender) penalty += 0.2;
  penalty += Math.min(phraseHits * 0.2, 0.5);
  if (academic) penalty = Math.max(0, penalty - 0.2);

  return { suppress: false, penalty: Number(penalty.toFixed(2)), reasons };
}
