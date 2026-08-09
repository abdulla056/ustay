# Worker Brief — UST-50: Primitive API refinements from /tokens dogfooding

Linear: https://linear.app/abdulla-safar/issue/UST-50/primitive-api-refinements-from-tokens-dogfooding

## Mission

Fix the four API gaps UST-47 found when first dogfooding the component library, before Phase 1/2
builds on them. Theme: the typography primitives tie the _voice_ to the _element_; pages whose
visual hierarchy differs from their document outline currently have to fight them.

## Read first (in the repo)

- The Linear issue — it carries the full context per gap.
- `src/lib/components/Label.svelte`, `Heading.svelte`, `Button.svelte`, `Stack.svelte`,
  `Grid.svelte` + their `.stories.svelte`.
- `src/routes/tokens/+page.svelte` — the consumer that hit the gaps (see its `aria-labelledby`
  workaround around the spine labels).

## Scope (do)

- [ ] **`Label`: heading render target** — an `as` (or `level`) prop accepting `h2`–`h6` alongside
      the current `p`/`span`/`div`. The numbered spine label is each section's real heading.
- [ ] **`Heading`: non-heading escape hatch** — `as="p" | "div"` for type specimens/decorative
      display lines; `level` keeps controlling optics-independent semantics as today.
- [ ] **`Button variant="paper"`: document the trap** — JSDoc + a Storybook docs note that it's
      intentionally invisible-ish on paper surfaces (it exists for CTAs over photography).
- [ ] **`Stack`/`Grid` gap seam** — resolve the `class="gap-*"` vs prop collision: either document
      "always use the prop" prominently (JSDoc + story) or accept a custom value via the prop.
      Pick one; explain the choice in the report.
- [ ] Update/extend the stories for every change; a11y addon stays violation-free.
- [ ] **Dogfood check:** simplify `/tokens` to use `Label as="h2"` and drop its `aria-labelledby`
      workaround, proving the fix.
- [ ] Backward compatible: existing usage (stories, `/tokens`, `/motion`) must compile unchanged.

## Out of scope (don't)

- No new components, no `src/lib/index.ts` changes — **UST-46 is adding components in parallel
  and owns the barrel this wave.** No token/`layout.css` changes. Don't touch `/motion`, the
  prototype, or anything under `src/lib/motion/`.

## Acceptance

- All four gaps addressed; `/tokens` outline has real `h2`s; stories updated and a11y-clean.
- `bun run check` / `lint` / `test` green; CI green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md` (incl. fresh-worktree setup). Branch `ust-50-primitive-refinements`
off latest `main`. Validate every `.svelte` with the Svelte MCP autofixer. Linear UST-50
In Progress → Done (tick the checklist). Commit `UST-50: <summary>` + trailer
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Push, open a PR to `main`, don't merge.

## Report back to orchestrator

PR link, the final prop APIs, which gap-seam option you picked and why, and any further API
smells you noticed while in there.
