# Architecture — plan → code map

This document maps the locked plan ([`FINAL-PLAN.md`](FINAL-PLAN.md)) onto the code in this repo, so a reviewer can trace every decision to where it lives.

## The pipeline (§5)

```
GMAIL API ─▶ NORMALIZER ─▶ INTERNAL MODEL ─▶ EXTRACTOR ─▶ GENERATED SURFACE
```

| Stage | Code | Plan |
|---|---|---|
| Gmail API access | `src/lib/gmail/client.ts`, `scopes.ts` | §2, §4 (incremental OAuth, read-only first) |
| Ingestion (historical + live) | `src/lib/gmail/ingest.ts` | §4 week 1–2, §9.2 |
| Normalizer | `src/lib/gmail/normalizer.ts` | §5 |
| Internal model | `src/lib/model.ts` | §5 |
| Extraction | `src/lib/extraction/` | §4 week 3, §9.1 |
| Eval + gate | `eval/` | §7 |
| Surface | `src/components/Surface.tsx` | §3, §6 |
| Write rails | `src/lib/actions/rails.ts` | §6 |

## Build sequence is enforced by structure (§4, extraction-first)

The surface (`components/`) reads only the internal model and a sample. Extraction (`extraction/`) and its eval (`eval/`) stand alone and need **no** UI and **no** credentials to run. This makes it natural to do the week-3 extraction eval before investing in the surface — exactly the "no UI saves bad extraction" sequencing the plan locks in.

## Why the model is the boundary (§2 interface rot)

`normalizer.ts` is the only module that understands the Gmail wire format (headers, base64url bodies, MIME parts). Everything downstream depends on `model.ts` types. A Gmail API change is contained to the normalizer.

## The three load-bearing fields (§5, §6, §7)

Every `Deadline`/`Event` carries:

- `category` — drives the per-category gate (§7) and surface grouping.
- `confidence` — drives the §6 shadow paths (low-confidence → "confirm?", never silently committed).
- `source_msg_id` — **provenance**: every item links back to the source email, the trust anchor.

## Stubs and the questions that gate them (§9)

| Stub | Throws pointing at | Why it's a stub, not a guess |
|---|---|---|
| `gmail/client.ts` `createGmailClient` | §9.3 OAuth/CASA | Restricted scopes may trigger a Google security assessment; confirm before wiring. |
| `gmail/ingest.ts` `applyHistoryDelta` | §9.2 Pub/Sub + watch + polling | Live push infra is real work; the W3 eval only needs historical pull. |
| `extraction/llm.ts` `LlmExtractor` | §9.1 architecture, §9.4 privacy | What content is sent to the model / stored is a decision to make before any email leaves the box. |

Each stub throws a clear error rather than silently returning empty data, so it can't be mistaken for working code.

## GO / KILL gate (§7)

`eval/gate.ts` encodes per-category recall + precision floors with harm weights. `eval/run.ts` matches predictions to gold per category and exits non-zero on KILL. Retention is intentionally excluded — it isn't statistically meaningful at N=5.
