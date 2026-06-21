# FINAL PLAN — Personal Software Surfaces (Student Wedge)

_Reviewed by /plan-ceo-review on 2026-06-21 · Mode: HOLD SCOPE · For Rishi & Manav_
_Source: `personal-software-surfaces-rishi-manav.pdf` (founder memo) + `Idea.txt`_
_Outside voice: Codex (cross-model), 3 tensions resolved into this plan._

---

## Decisions locked this review

| Decision | Choice | Why |
|---|---|---|
| First build | One persona, ONE **generated** surface | Tests the thesis with the smallest believable build. The memo's page-8 "prototype ONE vertical" — not page-7's "3 modes". |
| Review posture | HOLD SCOPE | You want a final, shippable plan. Make it sharp, not bigger. |
| Wedge persona | Student deadline calendar | Big, reachable market AND you live it (current Centennial student) — fast dogfooding + testers one hallway away. |
| Gmail access | Full: read + compose + calendar write | Full capability, with **incremental OAuth** so day-one consent is read-only. |
| **Build sequence** | **Extraction-first** (Codex) | Prove extraction on real inboxes BEFORE building the surface. No UI saves bad extraction. |
| **Data boundary** | **Gmail-only, promise reframed** (Codex) | Stay Gmail-only; narrow the promise to email-derived deadlines (Gmail is the notification layer, not the source of truth). |
| **GO/KILL gate** | **Extraction accuracy = hard gate; retention = qualitative** (Codex) | At N=5, retention is anecdote. Per-item accuracy is statistically real at small N. |

---

## 1. The bet (sharpened)

A student's coding agent **generates** a deadline surface over their Gmail — email-derived due dates, event RSVPs, forms to submit, professor threads needing a reply — instead of a generic inbox.

**One-sentence differentiation (memorize):**
> Gemini Spark automates *inside* one fixed inbox shape. We change the *shape* of the inbox per person.

Honest caveat from the outside voice: that sentence alone is not yet a moat (Google Workspace MCP, Apps SDK, and Gemini already extract events). Your real defensibility has to be **taste in the per-persona surface + the data/learning loop**, not the plumbing. Treat weeks 1–6 as the test of whether the generated surface is meaningfully better than what Google ships by default. If it isn't, that's the kill signal — and that's fine to learn in 6 weeks.

---

## 2. Strategic & feasibility risks — named, with mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Platform sandwich** — MCP Apps + OpenAI Apps SDK do "primitives → agent composes UI" as a platform feature. | High | Own taste + workflow data, NOT the runtime/substrate. |
| **Incumbent in-lane** — Gemini Spark (May 2026) already does agentic Gmail + event extraction. | High | The differentiation sentence is the test. If you can't beat default Google, stop. |
| **OAuth restricted scopes / CASA (NEW, from Codex)** — `gmail.readonly` and `gmail.compose` are *restricted* scopes; storing/transmitting that data can trigger a Google third-party security assessment (CASA) costing weeks + money. | High | For the 6-week test, stay in **read-only** and keep `gmail.compose` behind a flag you may not flip until after the gate. Confirm assessment requirements before week 1. This can break the timeline — de-risk it now. |
| **Trust failure** — you chose full read+compose+calendar-write. | High | Incremental OAuth; every write behind preview + approval + undo + audit log; nothing auto-sends (§6). |
| **Gmail is the notification layer, not the truth (NEW, from Codex)** — real deadlines live in LMS/syllabus. | Med-High | Promise reframed to email-derived deadlines; accuracy measured against what's IN email; syllabus-PDF import is a fast-follow, NOT MVP (§8). |
| **Interface rot** — Google API changes break surfaces. | Med | Surfaces read the internal model (§5), never raw Gmail. |

---

## 3. The wedge surface — what a student sees

A **deadline operating view**, not an inbox:

- **Due soon** — email-derived assignment/form/fee deadlines, each with a **confidence score and a link back to the source email (provenance)**.
- **Events** — RSVPs, club events, exam times, one-tap "add to calendar."
- **Needs a reply** — professor threads waiting on you, drafted reply ready for approval.
- **Empty/quiet state** — "Nothing due in the next 7 days" is a designed state, not a blank screen (§6).

**Promise (reframed, honest):** _"Never miss an emailed deadline, form, or professor reply."_ Not "every deadline you have" — email can't deliver that, and promising it sets up the 80% target to fail.

Product stance (from memo, kept): the agent **proposes** an opinionated surface from observed inbox behavior + 3 setup questions. No blank canvas. No invisible mutation.

---

## 4. The 6-week build (re-sequenced: extraction-first)

| Week | Deliverable | Notes |
|---|---|---|
| 1–2 | **Email model + ingestion** | Connect Gmail (incremental OAuth, **read-only first**). Normalize to the internal model (§5). NOTE: live "observe inbox" needs Gmail push = **Pub/Sub + a watch renewed every 7 days + a polling fallback** — budget for it; for the offline eval in W3 you only need a historical pull. |
| 3 | **Extraction eval (the load-bearing test)** | Run extraction on **real, hand-labeled historical inboxes**. Measure **recall and precision per category** (exam date, assignment, form, RSVP, fee). Do NOT build UI yet. Gate: clear the accuracy floor (§7) before proceeding. |
| 4–5 | **Surface generator + safe actions** | Only once extraction clears the bar: agent generates the deadline surface from the model (not a template). Actions: add-to-calendar (`calendar.events` at first use), draft-reply (`gmail.compose` at first use — guarded by the CASA risk above). Every write: preview → approve → undo → audit log. Nothing auto-sends. |
| 6 | **Testers** | Put it in front of students; instrument day-1/3/7 return. Read against the gate (§7). |

**Demo goal:** a student connects Gmail, answers 3 questions, and watches a generic inbox become a useful deadline surface in under five minutes — backed by extraction you already proved in week 3.

---

## 5. Data model (the stable substrate — minimal)

Surfaces read this, never raw Gmail. This protects against interface rot.

```
  GMAIL API ──▶ NORMALIZER ──▶ INTERNAL MODEL ──▶ AGENT ──▶ GENERATED SURFACE
                                   │
                                   ├─ Message   {id, thread, from, subject, body, date, labels}
                                   ├─ Person    {email, name, role_guess}
                                   ├─ Deadline  {title, due_at, category, source_msg_id, confidence}
                                   ├─ Event     {title, starts_at, source_msg_id, confidence}
                                   └─ Action    {type: reply|calendar, status: proposed|approved|done|undone}
```

Every Deadline/Event carries `category` + `confidence` + `source_msg_id` (provenance) — all three are load-bearing for the gate and the edge cases.

---

## 6. Edge cases + trust rails (load-bearing — you chose full write scope)

**Extraction shadow paths:**

| Situation | What the user must see |
|---|---|
| Empty / new inbox | Designed empty state: "Connect a busier label or import older mail." Never a blank grid. |
| No deadlines found | "No deadlines detected this week" + manual-add. Absence is a state. |
| Low-confidence extraction | Show it flagged: "Looks like a deadline — confirm?" Never silently drop, never silently commit. |
| Wrong extraction (hallucinated date) | One-tap dismiss + agent learns. An **"unknown" state** is a first-class outcome, not a forced guess. |
| Ambiguous professor thread | Draft shown, never sent without explicit approval. |

**Write-action rails (every read+compose+calendar-write):** preview the exact payload → explicit per-action approval (no batch auto-send) → undo on every committed write → audit log the student can read → incremental scope (write/compose requested at first use, not on the day-one screen).

A write that can happen without preview+approval+undo is a **CRITICAL GAP** — fix before testers touch it.

---

## 7. GO / KILL gate (rewritten for statistical honesty)

**Hard gate (statistically meaningful even at small N — many items per inbox):**
Category-weighted extraction accuracy on hand-labeled real inboxes. Weight failures by harm: **missing an exam/assignment deadline ≫ duplicating an RSVP**. Set per-category recall targets (e.g. exam-date recall ≥95%, with precision high enough that the surface isn't noisy). A single blended "80%" is banned — it hides the failures that matter.

**Qualitative signal (NOT a build/kill decision at N=5):**
Day-7 self-return of your 5 first testers = color, not proof. **Recruit ~15–20 testers before any retention number counts as a GO signal.**

**KILL / pivot triggers:**
- Extraction can't clear the per-category bar after week-3 iteration → extraction is the bottleneck; reassess approach before building UI.
- With 15–20 testers, day-7 retention <20% at passing accuracy → the surface isn't wanted; don't build persona #2.

Write the gate down before week 1.

---

## 8. NOT in scope (explicitly deferred)

- **3 surface modes** — one generated surface proves the thesis; three hardcoded modes dilute it.
- **Learning loop** — post-gate only.
- **Syllabus/LMS/PDF import** — the real source of truth, but a fast-follow AFTER the email wedge passes. Not MVP.
- **Other personas / other tools** — gated on §7.
- **Owning the primitive/contract substrate** — deliberately not your game (platform-sandwich risk).
- **`gmail.compose`/send in production** — kept behind a flag until the CASA assessment path is confirmed.

---

## 9. Open questions for /plan-eng-review (next step)

1. **Extraction architecture:** pure LLM per-email vs hybrid (deterministic date/entity parser + LLM for intent). Drives the per-category accuracy gate. Codex leans hybrid (deterministic UI + LLM extraction); decide here.
2. **Gmail ingestion mechanics:** Pub/Sub push, watch renewal (≤7 days), polling fallback, backfill of historical mail for the W3 eval.
3. **OAuth/CASA path:** confirm whether your data handling triggers a Google restricted-scope security assessment, and the cost/time. Blocks the compose feature.
4. **Privacy/processing:** what email content is sent to the model, what's stored, retention policy. Student mail is sensitive.
5. **Per-user LLM cost + caching** for surface generation/refresh.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | issues_open | HOLD SCOPE; 7 decisions locked; +1 missed risk (platform sandwich); 1 internal contradiction caught (memo p7 vs p8) |
| Codex Review | `/codex review` | Independent 2nd opinion | 1 | issues_found | 8 findings; 3 facts folded in (CASA, Pub/Sub, precision/recall); 3 tensions resolved (sequencing, data boundary, gate stats) |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | not yet run — 5 open questions in §9 |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | UI scope present — recommended before build |

- **CODEX:** ran (cross-model). All 3 substantive tensions resolved toward Codex's position (extraction-first, Gmail-only-reframed, accuracy-as-hard-gate); 3 feasibility facts incorporated.
- **CROSS-MODEL:** CEO review and Codex agree on the core risks (incumbent, trust). Codex pushed harder on feasibility (OAuth/CASA, Gmail-as-notification-layer, N=5 statistics) — all accepted.
- **VERDICT:** CEO review complete — strategy CLEARED at HOLD SCOPE. Eng review required before implementation (extraction architecture + OAuth/CASA path are the load-bearing unknowns).

**UNRESOLVED DECISIONS:**
- Extraction architecture (LLM-only vs hybrid) — deferred to /plan-eng-review §9.1
