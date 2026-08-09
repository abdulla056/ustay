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
- Fresh checkout/worktree setup: `bun install`, `bunx playwright install chromium` (browser-mode
  tests), and copy `.env.example` → `.env` (`hooks.server.ts` 500s without `DATABASE_URL`).
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

- `UST-6.md` — Design tokens & Tailwind v4 theme (**DONE + merged**, PR #1)
- `UST-7.md` — Base UI component library in Storybook (**DONE + merged**, PR #3 → 14 primitives in `src/lib/components/`, tone-scope system via `data-tone`)
- `UST-8.md` — Database & Drizzle conventions (**DONE + merged**, PR #2 → `docs/DATABASE.md` + `src/lib/server/db/helpers.ts`)
- `UST-9.md` — Project architecture & app packaging (**DONE + merged**, PR #6 → `docs/ARCHITECTURE.md`, app-shaped package.json, 4 route groups)
- `UST-40.md` — CI workflow: check/lint/test on every PR (**DONE + merged**, PR #5 → `.github/workflows/ci.yml`)
- `UST-45.md` — Motion utility layer, Lenis + GSAP in `src/lib/motion/` (**DONE + merged**, PR #8 → attachments + `/motion` demo; follow-ups UST-51…54)
- `UST-47.md` — Rebuild `/tokens` on the primitives + fix inverse accent contrast (**DONE + merged**, PR #7; API gaps → UST-50)
- `UST-46.md` — Nav + wordmark + motion wired into `(platform)` layout (also closes UST-51; owns `src/lib/index.ts` this wave)
- `UST-50.md` — Primitive API refinements from dogfooding (edits existing component files only)
- `UST-49.md` — Auth route protection in `hooks.server.ts` (server-side only)
