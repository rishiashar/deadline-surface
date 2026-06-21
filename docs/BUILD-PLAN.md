# Deadline Surface — Build Plan (Rishi × Manav, vibe-coding toward the vision)

*Produced with gstack lenses: `/plan-ceo-review` (10-star), `/plan-eng-review` (architecture/edge cases/tests), `/plan-design-review` (surface taste), DX/workflow.*

---

## TL;DR (the simple version)

**What we're building:** a robot that reads your Gmail (only *looks*, never sends) and turns the mess into a short, honest list of school deadlines — homework, exams, forms — with a "↗ from Prof. Lee" tag on each so you can trust it. That's the MVP. The big dream: every app ships *ingredients* and your agent bakes the interface *you* want (YC RFS).

**The one problem to fix now:** on real mail, our current finder is dumb — it flags LinkedIn/receipt spam as "deadlines." We make it smart.

**Who does what:**
- **Manav (backend, `codex` branch):** build the smart finder — parse real dates + an AI that knows *"assignment due"* ≠ *"free trial started."* Plus a test set + a pass/fail gate so it can't get worse.
- **Rishi (design, `claude` branch):** make the surface beautiful and trustworthy (deadline cards, the "is this a deadline? yes/no" step, preview→approve→undo), and build a **second look** from the same data (task-list vs calendar) to prove the dream.
- **Devin (me, `devin` branch):** glue, tests, reviews, keep branches in sync.

**The rule:** `main` is home base. Work on your branch, merge small + often, pull from `main` daily.

**Order:** ① align branches (done) → ② smart finder + gate (the make-or-break test) → ③ safe actions → ④ the second surface.

---

## 0. North star (why we're building)
**Vision (YC RFS — user-reshapable software):** companies ship *primitives*; each user's agent assembles the interface *they* need. Same inbox → my email looks like a task list, a student's looks like a deadline calendar.

**This repo = the MVP:** a read-only Gmail **deadline surface** — the smallest believable proof that an agent can extract clean primitives from a real app and render a genuinely personal surface that beats the default.

**The GO/KILL test (sharpened):** On a *real* student inbox, the surface must show genuine deadlines with **high precision** (almost no promo/notification false positives) and **strong recall on exams/assignments**, with provenance + confidence + designed empty states. If it can't beat default Gmail/Gemini on a student inbox in ~2 weeks → that's the kill signal. That's fine — it's the test.

---

## 1. Where we are right now (honest status)
- ✅ End-to-end live pipeline works: **Gmail API (read-only) → normalizer → internal model → extractor → surface**, on Rishi's real inbox (169 msgs, 12-month window).
- ✅ Confidence scores, provenance links, designed empty states, trust-rail UI scaffolding all render.
- ❌ **The #1 problem:** the deterministic heuristic extractor **over-fires** — on a year of real mail it tagged LinkedIn/receipt/promo email as "overdue assignments" at 65–80%. **This is the precision gap that defines our next milestone.**

---

## 2. Branch state (just audited) + how we collaborate

| Branch | State | Role going forward |
|---|---|---|
| **`main`** | default · source of truth · has shared `gstack` skill (PR #9) + README fix | **Integration.** Everything merges here via small PRs. Never commit directly. |
| **`devin`** | 2 commits ahead of an old main (testing skill + VISION RFS line), **3 behind** main | **Devin (me):** glue, eval harness, CI, PR reviews, keeping branches synced. |
| **`codex`** | 3 commits **behind** main, no unique work | **Manav (backend):** extraction, Gmail ingestion, internal model. |
| **`claude`** | 3 commits **behind** main, no unique work | **Rishi (design):** surface UI, design system, trust-rail UX. |

> ⚠️ We already hit **branch drift** (devin diverged from main). **Step 0 below fixes it**, and the workflow rule prevents recurrence: *rebase your branch on `main` daily; merge small + often.*

**Vibe-coding workflow**
1. `main` is protected/default — merge via small PRs, review before merge.
2. Each person works on their branch; **rebase on `main` daily** so we never drift again.
3. Devin drives gstack lenses on demand (`/plan-eng-review` before a feature, `/review` before merge, `/qa` on the UI) — since the `claude` CLI isn't auth'd, ask me to run them.
4. Demo the live surface to each other after every milestone.

---

## 3. Workstream split

### 🛠️ Manav — backend (`codex` branch)
1. **§9.1 LLM/hybrid extractor (TOP priority).** Deterministic date parsing **+** an LLM intent classifier that separates *"your assignment is due Thursday"* from *"your free trial started."* This is the precision fix.
2. **Eval set + GO/KILL gate.** Label a real (or synthetic) student inbox with per-category ground truth (assignment / exam / fee / form / event). Wire into `npm run eval` so precision/recall floors gate every change.
3. **Gmail ingestion hardening.** Incremental sync via `historyId`, correct token refresh (fix the `saveTokens` custom-path bug Devin Review flagged), pagination, rate-limit/backoff.
4. **Internal model / normalizer.** Keep `Message/Person/Deadline/Event/Action` clean and typed — this is the seed of the "delivery contract" that the whole vision rests on.

### 🎨 Rishi — design/frontend (`claude` branch)
1. **Surface polish:** Due Soon / Events / Needs a Reply — confidence badges, provenance links, designed empty states ("a quiet week is a designed state, not a blank screen").
2. **Low-confidence "confirm?" UX** — the trust moment where the user accepts/rejects a guessed deadline.
3. **Trust-rail components** for writes: preview → approve → undo → audit (design them now even though writes stay flagged off).
4. **★ Reshapability demo (the vision proof):** render a **second surface** from the *same* internal model — e.g. a "task-list" view vs the "deadline-calendar" view. This literally demonstrates "same primitives, different generated UI."
5. **Design tokens / system** so surfaces are swappable.

### 🤖 Devin — integration (`devin` branch)
Branch reconciliation, eval-harness wiring, CI, gstack reviews/QA, PR hygiene, and pairing with both of you.

---

## 4. Milestones (sequenced)

- **M0 — Align (today, Devin does it):** PR devin's 2 commits → main; reset `codex`/`claude`/`devin` to main so all four start identical.
- **M1 — Precision fix (~1 wk):** LLM/hybrid extractor + expanded labeled eval. **Gate: high precision on a promo-heavy real inbox.** ← the GO/KILL test.
- **M2 — Safe actions (~1 wk):** draft-reply preview + add-to-calendar, all behind preview→approve→undo. Read-only stays the default.
- **M3 — Reshapability demo:** a second generated surface from the same model. Proves the vision, not just the wedge.

---

## 5. Immediate next step
Manav's **LLM/hybrid extractor** is the single highest-leverage move — it turns the surface from "finds promo noise" into "finds real deadlines." Everything else compounds on top.
