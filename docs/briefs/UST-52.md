# Worker Brief — UST-52: ZoomGallery (sticky zoom-out gallery)

Linear: https://linear.app/abdulla-safar/issue/UST-52/zoomgallery-feature-component-prototypes-sticky-zoom-out

## Mission

The prototype's signature moment is a sticky, scroll-driven gallery. One hero frame fills the viewport,
and as you scroll it zooms out to reveal a composed mosaic of seven frames. Today it is markup-coupled
inside `src/routes/prototype/+page.svelte`. Turn it into a reusable `ZoomGallery` feature component
that the microsite Photo Gallery section (UST-26) will drop property photos into.

## Read first (in the repo)

- `DESIGN.md` (motion + photography), `src/routes/prototype/+page.svelte` (the original: read
  its gallery markup, CSS and GSAP code closely), `references/`.
- `src/lib/motion/` (loading gsap/ScrollTrigger client-side, Lenis integration, reduced-motion
  gating, `refreshMotion`), `docs/ARCHITECTURE.md` (`components/` vs `features/`, motion client-only).
- `src/lib/components/Image.svelte`.

## Decisions

- Location: `src/lib/features/gallery/ZoomGallery.svelte`, plus `ZoomGallery.stories.svelte` and a
  `types.ts`. It's a feature component, so it isn't exported from the `$lib` barrel.
- Props: `frames: GalleryFrame[]`, where `GalleryFrame = { src: string; alt: string; width: number; height: number; focalX?: number; focalY?: number; caption?: string }`.
  The shape deliberately matches the UST-14 `media_asset` columns, so UST-26 can map rows straight in.
  Also `label` (an accessible name for the region) and an optional `scrollLength` (default to the
  prototype's ~300vh).
- **Frame-count resilience:** the prototype is composed for 7 frames. Define layouts for 3–7 frames.
  More than 7 uses the first 7; fewer than 3 renders a simple static layout. Focal points drive
  `object-position`.
- **Reduced motion, and before JS:** a static editorial grid of the same frames with no sticky stage
  and no 300vh scroll. Server-render that grid, so the component is correct without JS. Enhance to the
  sticky zoom only when motion is allowed and JS has loaded.
- Motion: ScrollTrigger scrub synced with Lenis, transforms only (scale/translate, no layout
  properties), the `ease-editorial` feel, and `will-change` only while active. Clean up every trigger
  on destroy, and call `refreshMotion` after images load.
- A11y: every image has its alt text, and the sticky stage doesn't trap scroll or focus. Captions, if
  present, are visible in the static grid.
- Replace the prototype's inline gallery with the component if it's a clean swap. Otherwise leave the
  prototype alone and add a `/motion` demo section. Say which you did.

## Out of scope (don't)

- No database or server code, no microsite section wiring (that's UST-26), no new deps, no changes to
  `Nav`/`NavMenu`/`Footer` (another worker is finishing the mobile menu).

## Acceptance

- On `/motion` (or the prototype) the zoom-out plays smoothly at desktop and phone widths. Reduced
  motion and no-JS show the static grid. Layouts look composed for 3–7 frames (stories for each).
- Browser-mode tests for the static path (reduced motion: grid rendered, no sticky stage) and frame
  clamping. Svelte MCP autofixer clean. `bun run check`, `lint`, `test` green; CI green.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-52-zoom-gallery`. The
commit trailer names the model actually running. Linear UST-52 goes In Progress → Done. Rebase on
origin/main before pushing. Open a PR to `main`, don't merge. Poll `gh pr checks <n>` until CI
finishes. A dev server runs on 5173, so use another port and stop it when done.

## Report back to orchestrator

PR link, CI result, the prototype swap or the demo location, layout choices for 3–7 frames, perf
notes, new-issue candidates.
