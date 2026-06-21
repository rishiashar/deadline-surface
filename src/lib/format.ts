/** Small formatting helpers for the surface. */

export function formatDue(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Human "due in" label, e.g. "in 2 days", "today", "overdue". */
export function relativeDue(iso: string, now: Date = new Date()): string {
  const ms = new Date(iso).getTime() - now.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (ms < 0 && days <= -1) return `${Math.abs(days)}d overdue`;
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  const weeks = Math.round(days / 7);
  return weeks === 1 ? "in 1 week" : `in ${weeks} weeks`;
}

/** Urgency bucket for color treatment. */
export function urgency(iso: string, now: Date = new Date()): "overdue" | "soon" | "upcoming" {
  const days = (new Date(iso).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "upcoming";
}
