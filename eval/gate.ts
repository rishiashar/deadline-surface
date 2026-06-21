/**
 * GO / KILL gate (FINAL-PLAN §7) — written down before week 1, as required.
 *
 * Hard gate = category-weighted extraction accuracy on hand-labeled real
 * inboxes. Failures are weighted by HARM: missing an exam/assignment deadline
 * ≫ duplicating an RSVP. A single blended "80%" is BANNED — it hides the
 * failures that matter. So the gate is per-category recall AND precision floors.
 *
 * Retention is explicitly NOT encoded here: at N=5 it is anecdote, not a
 * build/kill decision (§7). Recruit ~15–20 testers before retention counts.
 */

import type { Category } from "../src/lib/model";
import { CATEGORIES } from "../src/lib/model";

export interface CategoryTarget {
  /** Minimum recall — "did we catch the real ones?" */
  minRecall: number;
  /** Minimum precision — "is the surface noisy?" */
  minPrecision: number;
  /** Harm weight for the category-weighted summary (higher = worse to miss). */
  harmWeight: number;
}

/**
 * Per-category floors. Exam/assignment recall is the highest bar — missing
 * those is the harm we most want to avoid (§7). Tune against real labeled data.
 */
export const GATE_TARGETS: Record<Category, CategoryTarget> = {
  exam: { minRecall: 0.95, minPrecision: 0.85, harmWeight: 5 },
  assignment: { minRecall: 0.9, minPrecision: 0.8, harmWeight: 4 },
  form: { minRecall: 0.8, minPrecision: 0.75, harmWeight: 2 },
  fee: { minRecall: 0.9, minPrecision: 0.8, harmWeight: 3 },
  rsvp: { minRecall: 0.7, minPrecision: 0.7, harmWeight: 1 },
};

export interface Counts {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
}

export interface CategoryScore extends Counts {
  category: Category;
  recall: number;
  precision: number;
  passedRecall: boolean;
  passedPrecision: boolean;
  passed: boolean;
}

export interface GateReport {
  perCategory: CategoryScore[];
  /** Harm-weighted recall across categories — a summary, NOT the gate itself. */
  weightedRecall: number;
  /** GO only if EVERY gated category clears BOTH floors. */
  go: boolean;
  failingCategories: Category[];
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : numerator / denominator;
}

export function scoreCategory(category: Category, counts: Counts): CategoryScore {
  const target = GATE_TARGETS[category];
  const recall = ratio(counts.truePositives, counts.truePositives + counts.falseNegatives);
  const precision = ratio(counts.truePositives, counts.truePositives + counts.falsePositives);
  const passedRecall = recall >= target.minRecall;
  const passedPrecision = precision >= target.minPrecision;
  return {
    category,
    ...counts,
    recall,
    precision,
    passedRecall,
    passedPrecision,
    passed: passedRecall && passedPrecision,
  };
}

export function buildGateReport(countsByCategory: Record<Category, Counts>): GateReport {
  const perCategory = CATEGORIES.map((c) => scoreCategory(c, countsByCategory[c]));

  let weightedNum = 0;
  let weightedDen = 0;
  for (const score of perCategory) {
    const w = GATE_TARGETS[score.category].harmWeight;
    weightedNum += w * score.recall;
    weightedDen += w;
  }

  const failingCategories = perCategory.filter((s) => !s.passed).map((s) => s.category);

  return {
    perCategory,
    weightedRecall: weightedDen === 0 ? 0 : weightedNum / weightedDen,
    go: failingCategories.length === 0,
    failingCategories,
  };
}
