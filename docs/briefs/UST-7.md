# Worker Brief — UST-7: Base UI component library in Storybook
Linear: https://linear.app/abdulla-safar/issue/UST-7/base-ui-component-library-in-storybook

## Mission
Seed Ustay's reusable UI primitives — the standardized set every page and (later) every
microsite section composes from. UST-6 shipped the design tokens; this turns them into
**components** so nothing downstream hand-rolls typography, buttons, or cards. Each primitive
gets a Storybook story with a11y checks, so the library is browsable and testable in isolation.

## Read first (in the repo)
- `DESIGN.md` — the look these components must embody (editorial serif luxury, restraint).
- `src/routes/layout.css` — the **UST-6 token layer**. Build components from these utilities only
  (`font-display`, `text-display-*`, `text-eyebrow/label/lead`, `bg-ink`, `text-paper`, `text-accent`,
  `bg-surface`/`text-content*`, `tracking-*`, `rounded-image/frame/pill`, `px-gutter`, `shadow-frame`).
  **No inline hex, no ad-hoc font sizes** — if a value is missing, add a token in `layout.css`.
- `src/routes/tokens/+page.svelte` — how the utilities are meant to be used.
- `src/routes/prototype/+page.svelte` — the real-world patterns to extract into components
  (nav pill CTA, solid-paper vs. outline buttons, numbered section labels, the card =
  frame + image + name/location/price row, aspect-ratio image frames). Do NOT edit the prototype.
- `.storybook/main.ts` + `.storybook/preview.ts` — Storybook is already configured (svelte-csf,
  a11y, docs, vitest addons). **Gotcha:** `preview.ts` does not yet import the global stylesheet,
  so stories render without tokens/fonts — see Scope.

## Scope (do)
- [ ] **Make Storybook inherit the design system.** In `.storybook/preview.ts` import the global
      stylesheet (`../src/routes/layout.css`) and the fontsource fonts (same imports as the root
      layout), so every story gets the tokens + Fraunces/Inter. Add a paper/ink background preset.
- [ ] **Components** under `src/lib/components/` (one folder or file per primitive), barrel-exported
      from `src/lib/index.ts`. Svelte 5 runes; typed `$props()`; `{@render children()}` for slots;
      forward `class` + rest props so consumers can extend. Seed set (mirrors the Linear checklist):
      - **Layout:** `Container` (max-width + `px-gutter`), `Section` (vertical rhythm + optional
        surface/inverse tone), `Grid`, `Stack`.
      - **Typography:** `Heading` (Fraunces display; size prop mapping to `text-display-*`),
        `Text` (Inter body; `lead`/`base`/`sm`), `Eyebrow`, `Label` (numbered section label —
        accent, uppercase, `tracking-label`).
      - **Actions:** `Button` (variants: solid-paper, outline/currentColor, ghost; pill radius;
        real `<button>`/`<a>` semantics), `Link`.
      - **Content:** `Badge`/`Tag`, `Card` (image frame + content slot, from the prototype),
        `Image` (aspect-ratio prop, `loading="lazy"`, `object-cover`, alt required), `Icon`
        (inline-SVG wrapper sized in `em`).
- [ ] **A `.stories.svelte` per component** (svelte-csf), covering the main variants/states, with
      controls for key props. The a11y addon must show **no violations** (buttons/links have
      accessible names, `Image` requires `alt`, colour contrast holds on both tones).
- [ ] **Motion-agnostic.** Components take classes/children and stay static — no baked-in scroll
      animation. The Lenis+GSAP motion layer is a separate issue (see below) that will wrap these.

## Out of scope (don't)
- Don't build the **Lenis + GSAP motion utility layer** — file/await it as its own issue; keep
  these primitives static and composable so the motion layer can animate them later.
- Don't build page layouts, microsite sections, or routes (those are Phase 2). Don't edit the
  prototype or the `/tokens` route. Don't add a component the seed set doesn't call for — the
  library "grows over time."

## Acceptance
- Storybook (`bun run storybook`) renders every primitive **with tokens + fonts applied**, each
  with a story and controls; a11y panel clean.
- Components import only from the token layer (no inline hex / magic sizes) and match `DESIGN.md`.
- Primitives are exported from `$lib` and usable in a route.
- `bun run check` / `lint` / `test` all green (the vitest Storybook project runs the stories).

## House rules
See `docs/briefs/WORKFLOW.md`. Branch `ust-7-base-ui-components` off latest `main` (UST-6 is merged).
Validate every `.svelte` with the Svelte MCP autofixer. Linear UST-7 In Progress → Done (tick its
checklist). Commit `UST-7: <summary>` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
Push, open a PR to `main`, **don't merge** — the orchestrator/user merges.

## Report back to orchestrator
PR link, the final component list + prop APIs (esp. `Button`/`Heading` variant names), any tokens
you had to add to `layout.css`, and new-issue candidates (the **motion layer**; likely a
repo-wide `prettier --write` to clear pre-existing lint debt).
