# Worker Brief — UST-53: Line-splitting for display type

Linear: https://linear.app/abdulla-safar/issue/UST-53/line-splitting-for-display-type-splittext-or-displaylines

## Mission

`displayEntrance` (in `$lib/motion`) does DESIGN.md's masked line-by-line reveal of display type,
but callers must hand-write two nested spans per line. Remove that manual contract so any heading
can get the reveal by passing plain text.

## Read first (in the repo)

- `DESIGN.md` (motion: weighted, masked display reveals), `src/routes/prototype/+page.svelte`.
- `src/lib/motion/` (all of it, especially `reveal.ts`, `config.ts`, `internal.ts`, reduced-motion
  gating and `isInViewport`), plus the tests.
- Call sites: `src/routes/(platform)/+page.svelte`, `src/routes/motion/+page.svelte`.

## Decisions

- Use **GSAP's `SplitText`** (bundled with `gsap` ≥3.13, now free) inside the attachment, with
  `mask: 'lines'` and `autoSplit`/re-split on resize so lines re-wrap correctly. Add no new deps.
  If SplitText proves unworkable (SSR, fonts, a11y), fall back to a `<DisplayLines>` component and
  explain why.
- **Fonts:** split only after `document.fonts.ready`, or line breaks will be wrong with the serif
  display face.
- **A11y:** the heading's accessible name must stay the original text. SplitText's `aria` option
  should handle it; verify it.
- **Reduced motion:** no splitting at all, and the content is visible immediately. **SSR:** the server
  renders the plain text, and nothing is primed invisible before hydration (keep UST-59's
  in-viewport behaviour).
- **Backward compatible:** existing hand-split markup keeps working, or is migrated in the same PR.
  Migrate both call sites to plain text.
- gsap stays client-only (dynamic import inside the attachment, per ARCHITECTURE.md).

## Out of scope (don't)

- No new motion patterns, and no changes to `Nav`, the footer or components outside `$lib/motion`
  beyond the two call sites. No DB/server code.

## Acceptance

- `/` and `/motion` show the masked line reveal from plain text, it re-wraps correctly on resize,
  and it's correct at phone widths. Reduced motion shows static text.
- Tests for split and no-split paths (browser mode). Svelte MCP autofixer clean on changed `.svelte`.
  `bun run check`, `lint`, `test` green; CI green.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-53-split-lines`. The
commit trailer names the model actually running. Linear UST-53 goes In Progress → Done. Push, open
a PR to `main`, don't merge. Poll `gh pr checks <n>` until CI finishes. A dev server already runs on
5173, so use another port and stop it when done.

## Report back to orchestrator

PR link, CI result, SplitText vs DisplayLines and why, a11y verification, new-issue candidates.
