# Deadline Surface

> Gemini Spark automates *inside* one fixed inbox shape. **We change the *shape* of the inbox per person.**

A student's coding agent **generates** a deadline surface over their Gmail — email-derived due dates, event RSVPs, forms to submit, and professor threads needing a reply — instead of a generic inbox.

**Promise (honest, reframed):** _"Never miss an emailed deadline, form, or professor reply."_ Not "every deadline you have" — email is the notification layer, not the source of truth.

This repo is the **docs + code scaffold** for the 6-week test described in [`docs/FINAL-PLAN.md`](docs/FINAL-PLAN.md). It is built **extraction-first**: the load-bearing test is whether extraction clears a per-category accuracy gate on real inboxes *before* any surface is worth building.

---

## What's here

| Area | Path | Status |
|---|---|---|
| **Internal model** (the stable substrate, §5) | `src/lib/model.ts` | ✅ implemented |
| **Gmail normalizer** (raw Gmail → model) | `src/lib/gmail/normalizer.ts` | ✅ implemented |
| **Gmail OAuth scopes** (read-only first, incremental) | `src/lib/gmail/scopes.ts` | ✅ implemented |
| **Gmail OAuth flow** (read-only consent + token exchange) | `src/lib/gmail/tokens.ts`, `src/app/api/gmail/{auth,callback,disconnect}` | ✅ live (read-only) |
| **Gmail client + historical pull** (live read) | `src/lib/gmail/{client,ingest,live}.ts` | ✅ live read-only (`users.messages.list/get`) |
| **Gmail live delta** (Pub/Sub watch + history.list) | `src/lib/gmail/ingest.ts` | 🟡 stub (notes) |
| **Extraction — heuristic baseline** | `src/lib/extraction/heuristic.ts` | ✅ runnable, zero creds |
| **Extraction — LLM/hybrid** | `src/lib/extraction/llm.ts` | 🟡 stub (seam + privacy note) |
| **Eval harness + GO/KILL gate** (§7) | `eval/` | ✅ runnable (`npm run eval`) |
| **Surface UI** (Due soon / Events / Needs a reply) | `src/components/Surface.tsx` | ✅ renders from sample model |
| **Write-action trust rails** (preview→approve→undo→audit, §6) | `src/lib/actions/rails.ts` | ✅ implemented |

Connecting Gmail is **read-only** (`gmail.readonly` only) — the client only calls `users.messages.list/get`, there is no send/modify path. Keep the OAuth app in Google's **"Testing"** publishing status (≤100 test users) to use the restricted read-only scope without a CASA assessment (§2, §9.3).

🟡 remaining stubs are intentional seams: they throw a clear "not implemented" error pointing at the open plan question that gates them (live delta/Pub/Sub §9.2, LLM/hybrid architecture §9.1, privacy/retention §9.4).

---

## Architecture (§5 — surfaces never read raw Gmail)

```
GMAIL API ─▶ NORMALIZER ─▶ INTERNAL MODEL ─▶ EXTRACTOR ─▶ GENERATED SURFACE
              (gmail/)       (model.ts)       (extraction/)   (components/)
                                  │
                                  ├─ Message   {id, thread, from, subject, body, date, labels}
                                  ├─ Person    {email, name, role_guess}
                                  ├─ Deadline  {title, due_at, category, source_msg_id, confidence}
                                  ├─ Event     {title, starts_at, source_msg_id, confidence}
                                  └─ Action    {type: reply|calendar, status: proposed|approved|done|undone}
```

The normalizer is the only code that knows the Gmail wire format. When the Gmail API changes, only it changes — surfaces and extraction are insulated ("interface rot" mitigation, §2).

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000 — the surface, rendered from sample data
npm run eval     # run the extraction eval + GO/KILL gate against labeled fixtures
npm run build    # production build
npm run lint     # eslint
```

The surface renders from `src/lib/sample-data.ts` (no Gmail needed). It demonstrates the §6 shadow paths: a low-confidence item shows the **"Looks like a deadline — confirm?"** state, and the drafted reply walks **preview → approve → send → undo**.

### Connect a real inbox (read-only)

1. Create a Google Cloud OAuth client (Web application), enable the **Gmail API**, add the `gmail.readonly` scope, and add yourself as a **test user** (keep the consent screen in **"Testing"** to avoid CASA — §2/§9.3).
2. Add `http://localhost:3000/api/gmail/callback` as an authorized redirect URI.
3. Set the env vars and start the app:

   ```bash
   export GOOGLE_CLIENT_ID=...        # from the OAuth client
   export GOOGLE_CLIENT_SECRET=...
   export GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
   npm run dev
   ```

4. Open http://localhost:3000 → **Connect Gmail (read-only)** → consent. The home page now generates the surface from your last 60 days of mail. **Disconnect** drops the stored token. Tokens persist to a gitignored `.data/gmail-tokens.json` (scaffold store — retention is a §9.4 decision).

---

## The extraction eval (the load-bearing test, §4 week 3 / §7)

```bash
npm run eval
```

Loads every labeled inbox in `eval/fixtures/*.json`, runs an `Extractor`, matches predictions to gold **per category**, and prints the gate report. It exits non-zero on KILL so it can gate CI.

The gate (`eval/gate.ts`) is **per-category recall AND precision floors**, weighted by harm — missing an exam ≫ duplicating an RSVP. A single blended "80%" is **banned** because it hides the failures that matter (§7).

```
category     recall   precision   verdict
exam         ≥95%      ≥85%       ...
assignment   ≥90%      ≥80%       ...
fee          ≥90%      ≥80%       ...
form         ≥80%      ≥75%       ...
rsvp         ≥70%      ≥70%       ...
```

> Retention is deliberately **not** in the gate: at N=5 it is anecdote, not a build/kill signal. Recruit ~15–20 testers before any retention number counts (§7).

**Do not commit real student mail.** Fixtures are synthetic / de-identified; real hand-labeled inboxes stay out of version control.

---

## Trust rails (§6 — you chose full write scope)

Every write (reply / calendar) travels: **preview the exact payload → explicit per-action approval → undo → audit log → incremental scope**. Nothing auto-sends; there is no batch approve. A write that can happen without preview + approval + undo is a **critical gap** — see `src/lib/actions/rails.ts`.

`gmail.compose` is gated behind `COMPOSE_ENABLED` (default off) and the CASA restricted-scope assessment path (§2, §8).

---

## Explicitly out of scope (§8)

3 surface modes · learning loop · syllabus/LMS/PDF import · other personas · owning the primitive substrate · `gmail.compose`/send in production (until CASA path confirmed).

## Open questions before implementation (§9)

Extraction architecture (LLM-only vs hybrid) · Gmail ingestion mechanics (Pub/Sub + watch + polling) · OAuth/CASA path · privacy/retention · per-user LLM cost. See [`docs/FINAL-PLAN.md`](docs/FINAL-PLAN.md) §9.

---

## Docs

- [`docs/FINAL-PLAN.md`](docs/FINAL-PLAN.md) — the reviewed, locked plan (source of truth).
- [`docs/architecture.md`](docs/architecture.md) — how the plan maps to this code.
