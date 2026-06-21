/**
 * Internal model — the stable substrate (FINAL-PLAN §5).
 *
 * Surfaces read THIS, never raw Gmail. This boundary protects against
 * "interface rot" (§2): when the Gmail API changes, only the normalizer
 * (lib/gmail/normalizer.ts) changes — surfaces and extraction are insulated.
 *
 *   GMAIL API ─▶ NORMALIZER ─▶ INTERNAL MODEL ─▶ AGENT ─▶ GENERATED SURFACE
 */

/** Deadline/Event categories. Failure harm differs per category (§7). */
export type Category = "exam" | "assignment" | "form" | "rsvp" | "fee";

export const CATEGORIES: readonly Category[] = [
  "exam",
  "assignment",
  "form",
  "rsvp",
  "fee",
] as const;

/**
 * Confidence in [0,1]. Drives the shadow paths in §6:
 * low-confidence items are flagged ("Looks like a deadline — confirm?"),
 * never silently dropped and never silently committed.
 */
export type Confidence = number;

/** A best-guess at a person's role, used to surface "Needs a reply" threads. */
export type RoleGuess = "professor" | "ta" | "admin" | "club" | "peer" | "unknown";

/** Normalized email message — the raw substrate after normalization. */
export interface Message {
  id: string;
  thread: string;
  from: Person;
  subject: string;
  body: string;
  /** ISO-8601 timestamp. */
  date: string;
  labels: string[];
}

export interface Person {
  email: string;
  name: string;
  role_guess: RoleGuess;
}

/**
 * An email-derived due date. `source_msg_id` (provenance) + `confidence` +
 * `category` are all load-bearing for the gate (§7) and the edge cases (§6).
 */
export interface Deadline {
  id: string;
  title: string;
  /** ISO-8601 timestamp the thing is due. */
  due_at: string;
  category: Category;
  source_msg_id: string;
  confidence: Confidence;
}

/** An email-derived event (RSVP, club event, exam time, ...). */
export interface Event {
  id: string;
  title: string;
  /** ISO-8601 timestamp the event starts. */
  starts_at: string;
  source_msg_id: string;
  confidence: Confidence;
}

/**
 * A proposed/committed write. Every write travels the trust rails (§6):
 * preview → approve → undo → audit log. Nothing auto-sends.
 */
export type ActionType = "reply" | "calendar";
export type ActionStatus = "proposed" | "approved" | "done" | "undone";

export interface Action {
  id: string;
  type: ActionType;
  status: ActionStatus;
  /** Free-form, type-specific payload previewed to the user before approval. */
  payload: ReplyPayload | CalendarPayload;
  source_msg_id: string;
}

export interface ReplyPayload {
  kind: "reply";
  thread: string;
  to: string;
  subject: string;
  body: string;
}

export interface CalendarPayload {
  kind: "calendar";
  title: string;
  starts_at: string;
  ends_at?: string;
}

/**
 * The full normalized model an agent reads to generate a surface.
 * The surface is *generated* from this — never a hardcoded template (§4).
 */
export interface InboxModel {
  messages: Message[];
  people: Person[];
  deadlines: Deadline[];
  events: Event[];
  actions: Action[];
}
