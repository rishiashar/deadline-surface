/**
 * Labeled-inbox fixtures for the week-3 extraction eval (FINAL-PLAN §4, §7).
 *
 * A fixture is a set of normalized Messages plus the GOLD items a human labeled
 * for those messages. The eval runs an Extractor over the messages and scores
 * its output against this gold set, per category (§7).
 *
 * NOTE: ship NO real student mail in the repo. Fixtures are synthetic or
 * de-identified. Real hand-labeled inboxes live outside version control.
 */

import type { Message, Category } from "../src/lib/model";

export interface GoldDeadline {
  source_msg_id: string;
  category: Category;
  /** ISO date (day granularity is enough for matching). */
  due_at: string;
}

export interface GoldEvent {
  source_msg_id: string;
  /** ISO date. */
  starts_at: string;
}

export interface LabeledInbox {
  name: string;
  messages: Message[];
  gold: {
    deadlines: GoldDeadline[];
    events: GoldEvent[];
  };
}
