# Worker Brief — UST-61: Footer

Linear: https://linear.app/abdulla-safar/issue/UST-61/footer-component

## Mission

Build the site footer, the chrome counterpart to `Nav`, and mount it in the `(platform)` layout.
It closes DESIGN.md's dark → light → **dark** scroll arc, so it sits in the ink (inverse) tone and
should feel like the editorial sign-off of a luxury magazine, not a link dump.

## Read first (in the repo)

- `DESIGN.md` (all of it), `src/routes/prototype/+page.svelte`, `references/`.
- `src/lib/components/Nav.svelte`, `Wordmark.svelte` (which already supports `size="md"`/`"lg"` for
  this), `Section.svelte` (`tone="inverse"`), `Container`, `Grid`, `Stack`, `Link`, `Text`, `Eyebrow`.
- `src/lib/motion/` (`pageTone`/`tonalScroll`: the footer must play nicely with the tonal scroll),
  `src/routes/(platform)/+layout.svelte`, `docs/ARCHITECTURE.md` (components rules,
  `warnClassCollision`).

## Decisions

- It's a domain-free primitive: `src/lib/components/Footer.svelte` + `Footer.stories.svelte`,
  exported from `src/lib/index.ts`.
- Content is passed in as props (link groups `{ heading, links: {label, href}[] }[]`, plus an optional
  tagline). The `(platform)` layout supplies Ustay's placeholder content:
  - **Discover**: Destinations, Stays, Journal
  - **For owners**: List your property, How it works, Sign in (→ `/sign-in`)
  - **Ustay**: About, Contact
  - legal row: © year Ustay, Privacy, Terms

  Unbuilt pages link to `#` for now.

- Large `Wordmark` as the sign-off. Semantic `<footer>` with `nav` landmarks named per group.
- Motion: at most a restrained `reveal` on entry per DESIGN.md, via `$lib/motion` attachments in
  the layout or footer, with reduced motion respected. No new motion utilities.
- **Wordmark size token:** UST-46 noted the type scale jumps 1.3rem → 1.9rem, so the nav wordmark sits
  at `display-xs`. You decide whether a dedicated wordmark token is warranted. If yes, add it to
  `src/routes/layout.css`, apply it in `Wordmark`, and record the decision in the report.

## Out of scope (don't)

- No changes to `Nav.svelte` (another worker is building the mobile menu in it this wave), no
  database/server code, no `vite.config.ts`/`package.json`/CI.

## Acceptance

- The footer renders at the bottom of `/`, legible at AA in its tone at all widths (stacked on
  mobile), and doesn't break the tonal scroll. Stories cover default + minimal.
- Svelte MCP autofixer clean. `bun run check`, `bun run lint`, `bun run test` green; CI green.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-61-footer`. Commit trailer
names the model actually running. Linear UST-61 goes In Progress → Done. Push, open a PR to `main`,
don't merge. Poll `gh pr checks <n>` until CI finishes. A dev server is already running on 5173, so
use another port for visual checks and stop it when done.

## Report back to orchestrator

PR link, CI result, the wordmark-token decision, design choices worth reviewing, new-issue
candidates.
