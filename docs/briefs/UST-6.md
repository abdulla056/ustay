# Worker Brief — UST-6: Design tokens & Tailwind v4 theme
Linear: https://linear.app/abdulla-safar/issue/UST-6/design-tokens-and-tailwind-v4-theme

## Mission
Turn the locked art direction in `DESIGN.md` into the REAL foundation: a Tailwind v4 theme
with design tokens + self-hosted fonts, so every future screen inherits the Ustay look without
inline styles or CDN links. The prototype proved the direction; this makes it reusable.

## Read first (in the repo)
- `DESIGN.md` — palette, type, motion principles (source of truth)
- `src/routes/prototype/+page.svelte` — uses these values inline + a Google Fonts CDN link;
  you are formalizing those into tokens. Do NOT refactor or delete the prototype.
- `src/routes/layout.css` — current global stylesheet (imports tailwindcss + forms + typography)
- `CLAUDE.md` + project memory

## Scope (do)
- [ ] Add a Tailwind v4 `@theme` block in the global stylesheet with tokens from `DESIGN.md`:
      colors — ink #0B0F0E, paper #F4EFE6, accent #5C6B52, muted #6B6F68, prose #4A4D46,
      on-dark #FFFFFF, hairline rgba(11,15,14,.12); fonts — display: Fraunces, body: Inter;
      plus a sensible type scale, spacing, and radii consistent with the prototype.
- [ ] Self-host fonts via `@fontsource` (e.g. `@fontsource-variable/fraunces`,
      `@fontsource-variable/inter`) — `bun add` them, import in the root layout, and remove the
      real dependence on the Google Fonts CDN.
- [ ] Verify tokens resolve as Tailwind utilities (e.g. `bg-ink`, `text-paper`, `font-display`).
- [ ] Document tokens: a Storybook page OR a `/tokens` demo route showing palette + type scale.
- [ ] Light theme first, but structure tokens so a dark/theming layer can be added later.

## Out of scope (don't)
- Don't build UI components (that's UST-7). Don't refactor/delete the prototype.
- Don't build the Lenis+GSAP motion utility layer yet — note it as a follow-up for UST-7.

## Acceptance
- Tokens exist as Tailwind v4 utilities and match `DESIGN.md`.
- Fonts are self-hosted (no hard dependency on the Google CDN).
- A tokens showcase (Storybook page or `/tokens` route) renders palette + type.
- `bun run check` / `lint` / `test` all green.

## House rules
See `docs/briefs/WORKFLOW.md`. Branch `ust-6-design-tokens` off `main`; Svelte MCP autofixer on
every `.svelte`; Linear UST-6 In Progress → Done; commit with the Co-Authored-By trailer; push,
open a PR to `main`, don't merge.

## Report back to orchestrator
PR link, the final token names/scale chosen, and follow-ups (motion layer, dark theme) that
should become new issues.
