/**
 * Gmail OAuth scopes — incremental, read-only first (FINAL-PLAN §2, §4).
 *
 * Day-one consent is READ-ONLY. Write/compose scopes are requested at first
 * use, not on the day-one screen, and `gmail.compose` stays behind a flag
 * until the CASA restricted-scope assessment path is confirmed (§2, §8).
 *
 * `gmail.readonly`, `gmail.compose` are Google *restricted* scopes — storing
 * or transmitting that data can trigger a third-party security assessment
 * (CASA). De-risk this before week 1; do not flip the compose flag until the
 * assessment path is confirmed.
 */

export const SCOPE_GMAIL_READONLY = "https://www.googleapis.com/auth/gmail.readonly";
export const SCOPE_GMAIL_COMPOSE = "https://www.googleapis.com/auth/gmail.compose";
export const SCOPE_CALENDAR_EVENTS = "https://www.googleapis.com/auth/calendar.events";

/** Day-one consent. Read-only only — see §4 week 1–2. */
export const DAY_ONE_SCOPES: readonly string[] = [SCOPE_GMAIL_READONLY];

/**
 * Incremental scopes requested at first use of the corresponding action.
 * `calendar.events` is requested the first time a user taps "add to calendar";
 * `gmail.compose` the first time they approve a drafted reply (§4 week 4–5).
 */
export const INCREMENTAL_SCOPES = {
  /** Requested on first "add to calendar". */
  calendar: [SCOPE_CALENDAR_EVENTS] as const,
  /**
   * Requested on first drafted-reply approval. GUARDED by COMPOSE_ENABLED —
   * do not flip until the CASA assessment path is confirmed (§2, §8).
   */
  compose: [SCOPE_GMAIL_COMPOSE] as const,
} as const;

/**
 * Hard flag for the compose/send capability. Default OFF for the 6-week test.
 * Flipping this on in production requires the confirmed CASA path (§8).
 */
export const COMPOSE_ENABLED = process.env.COMPOSE_ENABLED === "true";
