---
name: gstack
description: Shared gstack workflow for deadline-surface. Use when setting up or using gstack/Claude Code skills for planning, review, QA, shipping, security, or browser-assisted AI work in this repo.
---

# gstack workflow

This repo already advertises gstack in `AGENTS.md`, and `CLAUDE.md` includes `@AGENTS.md`. Keep gstack as a global install under `~/.claude/skills/gstack`; do not vendor the gstack repo into this project.

## Install or refresh gstack

```bash
if [ ! -d "$HOME/.claude/skills/gstack/.git" ]; then
  git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git "$HOME/.claude/skills/gstack"
fi
(cd "$HOME/.claude/skills/gstack" && git pull --ff-only && ./setup --team)
```

If the project needs repo-level team bootstrap files, prefer the optional mode unless the user explicitly asks to block all AI work without gstack:

```bash
"$HOME/.claude/skills/gstack/bin/gstack-team-init" optional
```

Use `required` only with explicit user approval because it adds enforcement hooks.

## Common gstack calls

- Product/feature planning: `Load gstack. Run /office-hours, then /autoplan. Save the plan before implementation.`
- Code review: `Load gstack. Run /review.`
- Browser QA for a URL: `Load gstack. Run /qa https://...`
- Ship a PR: `Load gstack. Run /ship.`
- Security review: `Load gstack. Run /cso.`
- Debug/root-cause work: `Load gstack. Run /investigate.`

Claude Code should use `/browse` from gstack for web browsing and avoid `mcp__claude-in-chrome__*` tools, matching `AGENTS.md`.

## deadline-surface validation

Before shipping repo changes, run the usual project checks:

```bash
npm run lint
npm run build
npm run eval
```

The dev surface runs at `http://localhost:3000` with sample data:

```bash
npm run dev
```
