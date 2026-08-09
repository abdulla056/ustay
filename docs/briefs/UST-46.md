# Worker Brief — UST-46 (+ UST-51): Nav + wordmark, and motion wired into the (platform) layout

Linear: https://linear.app/abdulla-safar/issue/UST-46/nav-wordmark-component-fixed-nav-that-flips-tone
Also closes: https://linear.app/abdulla-safar/issue/UST-51/wire-smoothscroll-into-the-platform-layout-router-aware

## Mission

Give Ustay its chrome: the `Ustay` wordmark and the fixed nav that flips tone as the page scrolls
dark→light — and mount the motion layer in the `(platform)` layout so real pages finally scroll
the way the prototype does. One issue because the nav needs the layout mounted to be testable.

## Read first (in the repo)

- `DESIGN.md` + `src/routes/prototype/+page.svelte` — the nav pattern to match: wordmark
  (Fraunces italic swash), links, outline "Reserve ↗" CTA. Do NOT edit the prototype.
- `src/lib/motion/` + `src/routes/motion/+page.svelte` — the motion API. The `/motion` header is
  the working reference for tone flipping. Key contracts (from the motion worker):
  - The nav must **not observe scroll itself** — read `pageTone.current` and let CSS carry the
    change (`transition-colors duration-700 ease-editorial`, `text-content` vs `text-on-dark`).
  - Anchor jumps go through `scrollTo('#id', { offset: -96 })` so they don't fight Lenis.
  - The **page** owns the tonal backdrop (`data-tonal-backdrop` + `tonalScroll()`), not the nav.
- `docs/ARCHITECTURE.md` — where chrome components and the `(platform)` layout live.
- `src/lib/components/` — compose from the primitives (`Button` outline = the Reserve pattern).

## Scope (do)

- [ ] **`Wordmark`** component (Fraunces italic, token layer only, sizable).
- [ ] **`Nav`** component: fixed, composes Wordmark + links + `Button` outline CTA; tone-flips via
      `pageTone`; **pick and implement a legibility treatment over photography** (scrim, blur, or
      blend — visible problem on `/motion` at some scroll positions); accessible (landmark,
      focus-visible, AA in both tones); mobile: a sensible minimal state (no full menu system —
      that's future work; collapsing to wordmark + CTA is acceptable).
- [ ] **UST-51:** attach `smoothScroll()` in the `(platform)` layout, router-aware — on client
      navigation run `ScrollTrigger.refresh()` + reset Lenis scroll position (`afterNavigate`).
      Mount `Nav` in the same layout.
- [ ] The `(platform)` home page may gain a minimal dark hero + light section (primitives only) so
      the tone flip is demonstrable on `/` — placeholder content, clearly temporary, Phase 2
      rebuilds it.
- [ ] Stories for `Wordmark` and `Nav` (static: one story per tone via a `data-tone` decorator),
      a11y clean.

## Out of scope (don't)

- Don't edit the existing primitives or their stories — **UST-50 is editing those same files in
  parallel.** New files + the `(platform)` layout + `src/lib/index.ts` exports only.
- Don't edit `/motion`, `/tokens`, or the prototype. No dep changes. No full mobile menu.

## Acceptance

- `/` shows the fixed nav; scrolling the demo hero flips nav tone smoothly; anchor/momentum feel
  matches `/motion`; reduced-motion leaves everything static and legible.
- `bun run check` / `lint` / `test` green; `bun run build` succeeds; CI green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md` (incl. fresh-worktree setup). Branch `ust-46-nav-wordmark` off
latest `main`. Validate every `.svelte` with the Svelte MCP autofixer. Linear: UST-46 **and**
UST-51 In Progress → Done. Commit `UST-46: <summary>` + trailer
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Push, open a PR to `main`, don't merge.

## Report back to orchestrator

PR link, the legibility treatment you chose and why, the Nav/Wordmark API, and new-issue
candidates (full mobile menu is an expected one).
