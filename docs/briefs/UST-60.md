# Worker Brief — UST-60: Nav mobile menu

Linear: https://linear.app/abdulla-safar/issue/UST-60/nav-full-mobile-menu

## Mission

`Nav` collapses to wordmark + CTA below `md`. Build the real mobile menu: a full-screen editorial
overlay that opens and closes in DESIGN.md's motion language (weighted, cinematic, not snappy) and
is fully accessible.

## Read first (in the repo)

- `DESIGN.md` (motion section especially), `src/routes/prototype/+page.svelte`, `references/`.
- `src/lib/components/Nav.svelte`, `nav.ts`, `Nav.stories.svelte`, `chrome.svelte.test.ts`.
- `src/lib/motion/` (Lenis instance via `smoothScroll`, `ease-editorial`, reduced-motion gating),
  `src/routes/(platform)/+layout.svelte`.

## Decisions

- Keep the menu inside `Nav` (or a sibling `NavMenu.svelte` that `Nav` renders), driven by the same
  link list `Nav` already receives. Add no new props unless needed, and keep the API additive.
- A11y: toggle button with `aria-expanded` + `aria-controls` and an accessible name that changes
  (Open menu / Close menu). The open overlay is a modal dialog (`role="dialog"`, `aria-modal`). Add a
  focus trap, `Esc` to close, focus returns to the toggle on close, and links close the menu on
  navigate (`afterNavigate`).
- **Scroll lock:** stop Lenis (`lenis.stop()`/`start()`) while open, plus `overflow: hidden` on the
  root as a fallback when Lenis is off (reduced motion).
- Tone-aware like the bar: the overlay renders in the inverse (ink) tone regardless of the page
  tone. The bar's flip logic must keep working when the menu closes.
- Motion: staggered, weighted entrance of the links (a display-type list), with `ease-editorial`.
  Under reduced motion: an instant or opacity-only change, no transforms.
- Only below `md`. On desktop nothing changes.
- Motion libraries stay client-only per ARCHITECTURE.md (import gsap inside effects or through
  `$lib/motion`).

## Out of scope (don't)

- Don't touch `src/routes/(platform)/+layout.svelte`'s footer area, add a `Footer`, or edit
  `src/lib/index.ts`/`layout.css` (another worker owns the footer and possibly a wordmark token this
  wave). No server code, no deps.

## Acceptance

- At a phone width on `/`: the menu opens and closes smoothly, focus is trapped, Esc works, the page
  behind doesn't scroll, and the tone flip still works afterwards. Reduced motion is respected.
- Browser-mode tests for the a11y contract: `aria-expanded` toggles, Esc closes, focus returns.
  Story for the open state.
- Svelte MCP autofixer clean. `bun run check`, `bun run lint`, `bun run test` green; CI green.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-60-mobile-menu`. Commit
trailer names the model actually running. Linear UST-60 goes In Progress → Done. Push, open a PR to
`main`, don't merge. Poll `gh pr checks <n>` until CI finishes. A dev server is already running on
5173, so use another port for visual checks and stop it when done.

## Report back to orchestrator

PR link, CI result, design/motion choices worth reviewing, new-issue candidates.
