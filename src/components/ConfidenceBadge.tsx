import type { Confidence, Category } from "@/lib/model";

const CATEGORY_LABEL: Record<Category, string> = {
  exam: "Exam",
  assignment: "Assignment",
  form: "Form",
  rsvp: "RSVP",
  fee: "Fee",
};

export function CategoryTag({ category }: { category: Category }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {CATEGORY_LABEL[category]}
    </span>
  );
}

/** Provenance + confidence are load-bearing (§5, §6) — always shown. */
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const pct = Math.round(confidence * 100);
  const tone =
    confidence >= 0.8
      ? "bg-emerald-50 text-emerald-700"
      : confidence >= 0.6
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
      title="Extraction confidence"
    >
      {pct}% sure
    </span>
  );
}
