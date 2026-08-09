# Worker Brief — UST-45: Motion utility layer (Lenis + GSAP)

Linear: https://linear.app/abdulla-safar/issue/UST-45/motion-utility-layer-lenis-gsap-over-the-static-primitives

## Mission

Turn the prototype's inline motion code into Ustay's reusable motion layer, so pages and (later)
microsite sections get the DESIGN.md motion language — weighted, slow, "the easing is the brand" —
without hand-rolling GSAP per page. The UI primitives (UST-7) are deliberately static; this layer
wraps and animates them from the outside.

## Read first (in the repo)

- `DESIGN.md` — the motion section is the spec (weighted/cinematic, what to never do).
- `references/MOTION.md` — the researched motion patterns.
- `src/routes/prototype/+page.svelte` — the working implementation to extract from: Lenis setup
  (lerp 0.085, wheelMultiplier 0.9), `gsap.context` lifecycle, ScrollTrigger patterns (tonal
  scroll, image reveals, display-type entrances). **Do NOT edit the prototype.**
- `docs/ARCHITECTURE.md` — the motion layer lives in **`src/lib/motion/`**, client-only. Do not
  re-export it from `src/lib/index.ts` (that barrel is for the UI primitives; a parallel worker
  is touching consumers of it).
- `src/lib/components/` — the primitives you'll be animating; `Image` exposes `imgClass` as the
  media-animation handle; all components forward `class` + rest props.

## Scope (do)

- [ ] `src/lib/motion/` module: a smooth-scroll setup (Lenis + ScrollTrigger wiring + cleanup,
      usable from a layout), plus reusable reveal/entrance utilities — Svelte attachments/actions
      or exported helpers, whichever composes best with the static primitives. Typed, documented.
- [ ] Extract the prototype's named patterns: tonal scroll, image reveal (scale/clip), display-type
      entrance, parallax frame. Parameterise (duration/ease/stagger) with DESIGN.md defaults
      (`--ease-editorial` exists as a token).
- [ ] **`prefers-reduced-motion`**: every utility must degrade to no motion (content visible,
      no scroll hijack).
- [ ] SSR-safe: everything guards on browser; importing the module server-side must not crash.
- [ ] A small demo route `src/routes/motion/+page.svelte` (like `/tokens` for tokens) exercising
      each utility on real primitives — this is the visual acceptance surface.
- [ ] Unit tests where meaningful (reduced-motion switch, mount/cleanup contract). No new deps —
      `gsap` and `lenis` are already in `package.json`; **do not edit package.json/bun.lock**.

## Out of scope (don't)

- Don't edit the prototype, `/tokens` (a parallel worker owns it), or the UI primitives themselves
  (motion wraps them; if a primitive genuinely blocks you, report instead of editing).
- No page/section building beyond the `/motion` demo route. No nav/wordmark (UST-46 builds on this).

## Acceptance

- `/motion` demo shows the extracted patterns on primitives, honouring reduced-motion.
- `bun run check` / `lint` / `test` green; `bun run build` succeeds.
- No dependency changes.

## House rules

See `docs/briefs/WORKFLOW.md`. Branch `ust-45-motion-layer` off latest `main`. Validate every
`.svelte` with the Svelte MCP autofixer. Linear UST-45 In Progress → Done. Commit
`UST-45: <summary>` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
Push, open a PR to `main`, don't merge.

## Report back to orchestrator

PR link, the motion API (names + options), how UST-46's nav tone-flip should consume it, and
new-issue candidates.
