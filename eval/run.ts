/**
 * Extraction eval harness (FINAL-PLAN §4 week 3) — the load-bearing test.
 *
 * Usage:  npm run eval
 *
 * Loads every labeled inbox in eval/fixtures/*.json, runs an Extractor over the
 * messages, matches predictions to gold per category, then prints the GO/KILL
 * gate report (§7). Exits non-zero on KILL so it can gate CI / a build step.
 *
 * Swap the extractor below (heuristic → llm/hybrid) to compare architectures
 * (§9.1). The heuristic baseline runs with zero credentials.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Load a local env file so the LLM path picks up ANTHROPIC_API_KEY without
 * exporting it by hand (§9.4: the key stays in a gitignored file, never in the
 * shell history or this repo). Real env vars already set take precedence — we
 * only fill what's missing. `.env.local` wins over `.env`. No-op if neither
 * exists, so the zero-credential heuristic run is unaffected.
 */
for (const name of [".env.local", ".env"]) {
  if (existsSync(name)) process.loadEnvFile(name);
}

import type { Category } from "../src/lib/model";
import { CATEGORIES } from "../src/lib/model";
import { HeuristicExtractor } from "../src/lib/extraction/heuristic";
import { LlmExtractor } from "../src/lib/extraction/llm";
import type { Extractor } from "../src/lib/extraction/types";
import type { LabeledInbox, GoldDeadline } from "./labels";
import { buildGateReport, type Counts } from "./gate";

/**
 * Pick the extractor to gate (§9.1: compare architectures behind one interface).
 * Default is the heuristic baseline so `npm run eval` runs with zero credentials.
 * `EVAL_EXTRACTOR=llm` (or `hybrid`) runs the LLM path — needs ANTHROPIC_API_KEY.
 */
function selectExtractor(): Extractor {
  const choice = (process.env.EVAL_EXTRACTOR ?? "heuristic").toLowerCase();
  if (choice === "llm" || choice === "hybrid") return new LlmExtractor();
  return new HeuristicExtractor();
}

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "fixtures");

/** Two ISO timestamps match if they fall on the same UTC calendar day. */
function sameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

function emptyCounts(): Record<Category, Counts> {
  const out = {} as Record<Category, Counts>;
  for (const c of CATEGORIES) out[c] = { truePositives: 0, falsePositives: 0, falseNegatives: 0 };
  return out;
}

function loadFixtures(): LabeledInbox[] {
  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => JSON.parse(readFileSync(join(FIXTURES_DIR, f), "utf-8")) as LabeledInbox);
}

async function run(extractor: Extractor): Promise<void> {
  const fixtures = loadFixtures();
  if (fixtures.length === 0) {
    console.error(`No fixtures found in ${FIXTURES_DIR}`);
    process.exit(2);
  }

  const counts = emptyCounts();

  for (const inbox of fixtures) {
    const result = await extractor.extract(inbox.messages);

    // Score deadlines per category by matching (source_msg_id, category, day).
    const goldByCategory = new Map<Category, GoldDeadline[]>();
    for (const c of CATEGORIES) goldByCategory.set(c, []);
    for (const g of inbox.gold.deadlines) goldByCategory.get(g.category)!.push(g);

    const matchedGold = new Set<GoldDeadline>();
    for (const pred of result.deadlines) {
      const candidates = goldByCategory.get(pred.category) ?? [];
      const hit = candidates.find(
        (g) => !matchedGold.has(g) && g.source_msg_id === pred.source_msg_id && sameDay(g.due_at, pred.due_at),
      );
      if (hit) {
        matchedGold.add(hit);
        counts[pred.category].truePositives += 1;
      } else {
        counts[pred.category].falsePositives += 1;
      }
    }
    for (const g of inbox.gold.deadlines) {
      if (!matchedGold.has(g)) counts[g.category].falseNegatives += 1;
    }

    // Score events under the "rsvp" category (matched by source_msg_id + day).
    const matchedGoldEvents = new Set<(typeof inbox.gold.events)[number]>();
    for (const pred of result.events) {
      const hit = inbox.gold.events.find(
        (g) => !matchedGoldEvents.has(g) && g.source_msg_id === pred.source_msg_id && sameDay(g.starts_at, pred.starts_at),
      );
      if (hit) {
        matchedGoldEvents.add(hit);
        counts.rsvp.truePositives += 1;
      } else {
        counts.rsvp.falsePositives += 1;
      }
    }
    for (const g of inbox.gold.events) {
      if (!matchedGoldEvents.has(g)) counts.rsvp.falseNegatives += 1;
    }
  }

  const report = buildGateReport(counts);

  console.log(`\nExtractor: ${extractor.name}`);
  console.log(`Inboxes:   ${fixtures.length}`);
  console.log("\nPer-category (recall / precision vs floor):");
  console.log("  category     recall   precision   TP/FP/FN   verdict");
  for (const s of report.perCategory) {
    const r = `${(s.recall * 100).toFixed(0)}%`.padStart(5);
    const p = `${(s.precision * 100).toFixed(0)}%`.padStart(5);
    const tpfpfn = `${s.truePositives}/${s.falsePositives}/${s.falseNegatives}`.padStart(8);
    const verdict = s.passed ? "PASS" : "FAIL";
    console.log(`  ${s.category.padEnd(11)} ${r}     ${p}    ${tpfpfn}   ${verdict}`);
  }
  console.log(`\nHarm-weighted recall (summary only): ${(report.weightedRecall * 100).toFixed(1)}%`);

  if (report.go) {
    console.log("\nGATE: GO — every gated category cleared both floors.\n");
    process.exit(0);
  } else {
    console.log(`\nGATE: KILL/iterate — failing categories: ${report.failingCategories.join(", ")}`);
    console.log("Extraction is the bottleneck. Reassess before building UI (§7).\n");
    process.exit(1);
  }
}

run(selectExtractor()).catch((err) => {
  console.error(err);
  process.exit(2);
});
