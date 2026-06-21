# Vision

> **Every user becomes their own forward-deployed engineer.**
> Software companies ship *primitives*; each person's coding agent assembles them into an interface shaped around how *they* actually work.

This repo's Gmail deadline surface is the **MVP** — the smallest believable proof of a much bigger thesis. This document is the north star; [`FINAL-PLAN.md`](./FINAL-PLAN.md) is the locked 6-week test that gets us the first rung.

---

## The thesis

Before AI, everyone using a piece of software interacted with the **same interface**. "Personalization" was cosmetic — a few saved views, a theme, different imagery over an identical layout (Netflix looks the same for everyone; only the posters change). So almost all software has a **one-size-fits-all** feel instead of being shaped around a single person.

The exception was **enterprise software**, where forward-deployed engineers hand-customize the product for each customer until it fits them perfectly.

**Coding agents are now good enough to make every user their own forward-deployed engineer.** The way one person uses email (a triage task-list) is wildly different from how a student uses it (an events-and-deadlines calendar) — yet every email client looks basically the same. It shouldn't. Your agent should reshape it for you.

In the future, software companies will ship **shared primitives** with the full intention that users heavily modify the final interface.

---

## What this changes about the stack

Making software *user-reshapable* means rethinking how software is delivered. The open questions are the moat:

1. **The delivery contract.** What does a vendor publish so a user's agent can rebuild the UI? Probably **not** raw source code and **not** a sealed binary — a middle layer: typed **primitives + capabilities** (objects you can read, actions you can call, under explicit permissions).
2. **How deep can users modify?** Re-skinning the front end is table stakes (and easy for incumbents to copy). The defensible version lets agents recompose **middleware/workflow** safely — new joins across data, new actions — to unlock genuinely new use-cases.
3. **Trust & safety at the substrate.** If users' agents can reshape software, *every* generated surface needs **preview → approve → undo → audit** and permission scoping **by construction**, not as an afterthought.
4. **Taste + the learning loop.** Plumbing (MCP Apps, the OpenAI Apps SDK) will be commoditized fast. What compounds is **taste in generated surfaces** and **data on which surfaces actually work per persona**.

---

## The 10-star ladder

Each rung is a strictly bigger company. We only climb when the rung below is proven.

| Rung | What exists | What it proves |
|---|---|---|
| ⭐ **MVP (now)** | An agent generates ONE surface (deadlines) over ONE source (Gmail), **read-only**. | An agent can extract clean primitives from a real app and render a personal surface that beats the default. |
| ⭐⭐⭐ **Habit** | Surfaces *act* safely (preview→approve→undo), **learn** from corrections, span a few sources. | The per-person surface is stickier than the one-size-fits-all original. |
| ⭐⭐⭐⭐⭐ **The delivery stack** | A contract where a vendor publishes *primitives + data + safe extension points*, and any user's agent composes the final UI (and some middleware). | "Source vs binary? front-end vs middleware?" becomes **our spec**, not a scraping hack. |
| ⭐⭐⭐⭐⭐⭐⭐ **The platform** | A standard/marketplace where apps ship "agent-modifiable" by default; people share and fork surfaces. | Software is **generated per human**, not shipped per release. |

The Gmail deadline surface is rung ⭐. Same inbox, same primitives, radically different generated surface (mine → task list, a student's → events calendar) is the *whole thesis in miniature*.

---

## Guardrails (non-negotiable)

- **Don't try to *be* the runtime/substrate** that MCP Apps + the Apps SDK are racing to own — that's the platform sandwich, and we lose it. Own the **taste layer + per-user workflow data + the contract that makes apps user-modifiable.**
- **Beat the default, or stop.** Incumbents (e.g. Gemini Spark) already do agentic Gmail + event extraction. If a generated surface isn't *meaningfully* better than what ships free, that's the kill signal — and it's fine to learn that fast.
- **Trust is the product.** A write that can happen without preview + approval + undo is a critical gap. Read-only first; earn every new permission incrementally.

---

## How the MVP maps to the vision

| Vision concept | Where it already lives in this repo |
|---|---|
| **Primitives / delivery contract** | The internal model — `Message`, `Person`, `Deadline`, `Event`, `Action` (`src/lib/model.ts`, §5). A baby version of the vendor→agent contract. |
| **Agent generates the surface** | The extractor + surface renderer (`src/lib/extraction/`, `src/components/Surface.tsx`) build the view from the model, not a fixed template. |
| **Trust & safety by construction** | Write-action trust rails — preview → approve → undo → audit (`src/lib/actions/rails.ts`, §6). |
| **Prove it before scaling** | The per-category GO/KILL accuracy gate (`eval/`, §7). |
| **Read-only first** | `gmail.readonly` only; compose stays gated (`src/lib/gmail/scopes.ts`, §2). |

---

## Bumper-sticker

> **Today:** an agent reshapes your inbox.
> **The company:** software ships as primitives; your agent builds the app — for every piece of software you use.
