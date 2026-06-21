/**
 * Write-action trust rails (FINAL-PLAN §6).
 *
 * Every read+compose+calendar-write travels this exact path:
 *   preview → explicit per-action approval → undo → audit log → incremental scope.
 *
 * A write that can happen without preview + approval + undo is a CRITICAL GAP
 * (§6) — fix before testers touch it. Nothing auto-sends; there is deliberately
 * NO batch/auto-approve here.
 */

import type { Action } from "@/lib/model";

export interface AuditEntry {
  action_id: string;
  /** "previewed" | "approved" | "committed" | "undone" */
  event: AuditEvent;
  at: string;
}

export type AuditEvent = "previewed" | "approved" | "committed" | "undone";

/** Append-only audit log the student can read (§6). */
export class AuditLog {
  private entries: AuditEntry[] = [];

  record(action_id: string, event: AuditEvent): void {
    this.entries.push({ action_id, event, at: new Date().toISOString() });
  }

  forAction(action_id: string): AuditEntry[] {
    return this.entries.filter((e) => e.action_id === action_id);
  }

  all(): readonly AuditEntry[] {
    return this.entries;
  }
}

/**
 * Approve a proposed write. Requires the action to be "proposed" and an
 * explicit, per-action call — there is no batch approve by design (§6).
 */
export function approve(action: Action, log: AuditLog): Action {
  if (action.status !== "proposed") {
    throw new Error(`Cannot approve action in status "${action.status}" — must be "proposed".`);
  }
  log.record(action.id, "approved");
  return { ...action, status: "approved" };
}

/** Commit an approved write (the actual Gmail/Calendar call lives behind this). */
export function commit(action: Action, log: AuditLog): Action {
  if (action.status !== "approved") {
    throw new Error(`Cannot commit action in status "${action.status}" — must be "approved".`);
  }
  log.record(action.id, "committed");
  return { ...action, status: "done" };
}

/** Undo a committed write. Every committed write must be undoable (§6). */
export function undo(action: Action, log: AuditLog): Action {
  if (action.status !== "done") {
    throw new Error(`Cannot undo action in status "${action.status}" — must be "done".`);
  }
  log.record(action.id, "undone");
  return { ...action, status: "undone" };
}
