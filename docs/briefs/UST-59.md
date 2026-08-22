# Worker Brief — UST-59: reveal() play-on-mount mode (initial-viewport bug)

Linear: https://linear.app/abdulla-safar/issue/UST-59/reveal-needs-a-play-on-mount-mode-initial-viewport-bug

## Mission

Fix a real bug in the motion layer: `reveal()`'s default `start: 'top 82%'` is a scroll
threshold, so any element in the bottom ~18% of the _initial_ viewport is primed to opacity 0 and
stays invisible until the user first scrolls. UST-46's home hero sub-copy missed the line by 3px
and was invisible on load (worked around at its call site with `start: 'top bottom'`); `/motion`
still carries the latent issue.

## Read first (in the repo)

- `src/lib/motion/reveal.ts` (+ `internal.ts`, `config.ts`) — how priming/start work today.
- `src/routes/(platform)/+page.svelte` — the `start: 'top bottom'` workaround to replace.
- `src/routes/motion/+page.svelte` — the latent usages to fix.
- `src/lib/motion/media.ts` (`imageReveal`) and `reveal.ts`'s `displayEntrance` sibling — check
  both for the same edge.

## Scope (do)

- [ ] Make elements already inside the viewport at mount animate in immediately (respecting
      `delay`/`stagger`); the scroll threshold applies only to elements below the fold. Prefer
      making this the default behaviour over an opt-in flag — an invisible-until-scroll element
      is never what a caller wants — but keep the API additive/backward-compatible either way.
- [ ] Audit `displayEntrance` and `imageReveal` for the same edge; fix if affected.
- [ ] Replace the `start: 'top bottom'` workaround on the home page with the proper behaviour.
- [ ] Reduced-motion path unchanged (content visible, no priming). Unit tests for the new
      behaviour (the motion test file shows the existing DB-free patterns).

## Out of scope (don't)

- No new motion patterns, no API redesign, no changes to `src/lib/components/`, `/tokens`, or
  the prototype. No dep changes.

## Acceptance

- Loading `/` and `/motion` with a short viewport shows all initially-visible content without
  scrolling, in both motion modes.
- `bun run check` / `lint` / `test` green; `bun run build` succeeds; CI green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md` (incl. fresh-worktree setup). Branch `ust-59-reveal-onmount` off
latest `main`. Validate `.svelte` changes with the Svelte MCP autofixer. Linear UST-59
In Progress → Done. Push, open a PR to `main`, don't merge.

## Report back to orchestrator

PR link, the behaviour/API you settled on, whether displayEntrance/imageReveal were affected,
gate/CI results.
