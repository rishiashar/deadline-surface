---
name: testing-deadline-surface
description: How to run and verify the deadline-surface scaffold locally — dev server, extraction GO/KILL gate, lint/build, and the interactive surface flows to exercise. Use when testing or developing this repo.
---

# Testing the deadline surface

Node 22. Install once with `npm install`.

## Commands
- `npm run dev` — surface UI at http://localhost:3000. Renders from `src/lib/sample-data.ts`; **no secrets / no Gmail needed**.
- `npm run eval` — runs the extraction eval over `eval/fixtures/*.json` and prints the per-category GO/KILL gate. Exit code `0` = GO, `1` = KILL, `2` = error. CI-gateable.
- `npm run lint` / `npm run build` — eslint + Next production build (typechecks).

## What to verify in the UI (all client-side state, no backend)
1. **Low-confidence gating (§6):** the 42%-sure "Possible deadline" renders under "Looks like a deadline — confirm?" (it's below `LOW_CONFIDENCE_THRESHOLD` = 0.6 in `sample-data.ts`).
   - "Yes, add it" → promotes it into "Due soon" (count 4→5), confirm section disappears.
   - "Not a deadline" → removes it entirely (Due soon stays 4). Reload to reset state.
2. **Drafted-reply trust rails (§6):** in "Needs a reply", the flow is Review & approve → Send → "Sent" + Undo → "Undone — nothing was sent". State machine `proposed→approved→done→undone` is enforced in `src/lib/actions/rails.ts`. "Nothing auto-sends" is always shown.

## Stubbed by design (do NOT expect these to work)
- `src/lib/gmail/client.ts`, `ingest.ts` — throw "not implemented" (gated on OAuth/CASA, §9.2/§9.3).
- `src/lib/extraction/llm.ts` — throws (gated on §9.1/§9.4). The runnable extractor is `heuristic.ts`.
- `gmail.compose` is behind `COMPOSE_ENABLED` (default false). Keep it off.

## Notes
- Surfaces read the internal model (`src/lib/model.ts`), never raw Gmail — keep that boundary.
- Don't commit real student email; `eval/fixtures/` are synthetic/de-identified.
