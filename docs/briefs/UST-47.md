# Worker Brief — UST-47: Rebuild /tokens on the primitives + fix inverse accent contrast

Linear: https://linear.app/abdulla-safar/issue/UST-47/rebuild-tokens-route-on-the-primitives-fix-its-inverse-accent-contrast

## Mission

Make the `/tokens` showcase route dogfood the component library: rebuild it on the `$lib`
primitives so it doubles as a living usage example, and fix its known contrast bug along the way.

## Read first (in the repo)

- `src/routes/tokens/+page.svelte` — the current hand-built showcase (this is the file you own).
- `src/lib/components/` + `src/lib/index.ts` — the UST-7 primitives and their stories; use
  `Section`, `Container`, `Heading`, `Text`, `Eyebrow`, `Label`, `Button`, `Badge`, `Card`,
  `Image`, `Grid`, `Stack` wherever they fit.
- `src/routes/layout.css` — the token layer, including the `data-tone` scope system UST-7 added
  (semantic vars re-point per tone; `text-accent-c` is the tone-aware accent).
- `DESIGN.md` — the rubric.

## Scope (do)

- [ ] **Fix the contrast bug**: the inverse-surface heading currently uses
      `style="color: var(--color-accent)"` (3.4:1 on ink). Replace with `text-accent-c` inside a
      `data-tone="inverse"` scope (or `<Section tone="inverse">`) and drop the inline style.
- [ ] Rebuild the page on the primitives. Keep its purpose intact: it must still showcase the
      raw tokens (palette swatches, type scale, spacing, radii, shadows) — but composed with
      `Section`/`Heading`/`Text`/etc. instead of hand-rolled markup. Where a raw token swatch
      genuinely can't be a primitive, plain token-utility markup is fine.
- [ ] Add a short section demonstrating the primitives themselves (the Button variants, a Card,
      Badge, Label) on both tones — a quick visual reference without opening Storybook.
- [ ] No inline hex / ad-hoc sizes anywhere on the page when you're done.

## Out of scope (don't)

- Don't change tokens, primitives, or `layout.css` (a missing-token discovery = report it, don't
  add it). Don't touch the prototype. Don't add motion (UST-45 is building that layer in parallel
  — do not import from `src/lib/motion/`).

## Acceptance

- `/tokens` renders entirely from primitives + token utilities, both tones AA-clean (no 3.4:1
  accent on ink anywhere).
- `bun run check` / `lint` / `test` green.

## House rules

See `docs/briefs/WORKFLOW.md`. Branch `ust-47-tokens-rebuild` off latest `main`. Validate every
`.svelte` with the Svelte MCP autofixer. Linear UST-47 In Progress → Done. Commit
`UST-47: <summary>` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
Push, open a PR to `main`, don't merge.

## Report back to orchestrator

PR link, any primitive API gaps or missing tokens you hit (these become issues), and whether the
primitives felt right to compose with (DX feedback for the library).
