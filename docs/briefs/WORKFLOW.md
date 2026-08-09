# Multi-session workflow

Ustay is built across focused Claude Code sessions instead of one long thread.

- **Orchestrator session** — holds the roadmap, writes briefs, reviews & merges PRs, keeps
  Linear + project memory current. Does not implement issues itself.
- **Worker sessions** — one per Linear issue. Open a fresh session in this repo, paste
  `read docs/briefs/UST-<n>.md and complete it`, and it does that issue end-to-end.

Worker sessions inherit context automatically: `CLAUDE.md`, project memory, `DESIGN.md`,
and the code are all loaded in any session opened in this folder — so briefs stay lean.

## House rules (every worker session)

- Stack: SvelteKit (Svelte 5 runes), TypeScript, Tailwind v4, **bun**.
- Build to `DESIGN.md` exactly. Validate every `.svelte` with the Svelte MCP autofixer.
- Green gates before finishing: `bun run check`, `bun run lint`, `bun run test`.
- Branch `ust-<n>-<slug>` off latest `main`.
- Commit `UST-<n>: <summary>` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Linear issue: **In Progress** at start, **Done** at end (tick its checklist).
- Push the branch, **open a PR to `main`, and STOP — do not merge.** The orchestrator/user merges.

## Brief template

```
# Worker Brief — UST-<n>: <title>
Linear: <url>

## Mission
<goal + why>

## Read first (in the repo)
- DESIGN.md, src/routes/prototype/+page.svelte, references/, CLAUDE.md + memory

## Scope (do) / Out of scope (don't)
## Acceptance  (+ check/lint/test green)
## House rules  (see docs/briefs/WORKFLOW.md)
## Report back to orchestrator  (PR link, decisions, new-issue candidates)
```

## Brief index

- `UST-6.md` — Design tokens & Tailwind v4 theme  (**DONE + merged**, PR #1)
- `UST-7.md` — Base UI component library in Storybook  (**DONE + merged**, PR #3 → 14 primitives in `src/lib/components/`, tone-scope system via `data-tone`)
- `UST-8.md` — Database & Drizzle conventions  (**DONE + merged**, PR #2 → `docs/DATABASE.md` + `src/lib/server/db/helpers.ts`)
- `UST-9.md` — Project architecture & app packaging  (touches package.json/bun.lock — don't run at
  the same time as another issue that edits deps)
