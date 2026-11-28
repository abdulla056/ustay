# Worker Brief — UST-31: Microsite template assembly (theme, chrome, tonal arc)

Linear: https://linear.app/abdulla-safar/issue/UST-31/template-assembly-system

## Mission

This is Phase 2's exit criterion. All eight sections are merged and render in order at
`/s/rumah-kabus`, but the page isn't yet _one_ designed thing. Your job is to:

- apply the property's **theme**;
- add consistent **microsite chrome** (nav and footer);
- choreograph DESIGN.md's **dark → light → dark tonal arc** across the sections.

Then polish the page until it reads as a finished, branded microsite at desktop and phone widths.

## Read first (in the repo)

- `DESIGN.md`, all of it, especially the tonal arc, motion, the "Platform vs. property" section and
  the "Never do" list. Also read `PROJECT_CONTEXT.md` and `docs/DECISIONS.md` (#6 and #8).
- `docs/ARCHITECTURE.md`:
  - the microsite section;
  - how a section plugs in, including the `number` prop;
  - the RichText and markdown rule.
- `src/routes/(microsite)/*`, `src/lib/features/microsite/*` (the registry, `types.ts`,
  `MicrositeRenderer`, every section) and `src/lib/server/microsite/load.ts`.
- `src/lib/components/Nav.svelte`, `NavMenu.svelte`, `Footer.svelte` and `Section.svelte`.
- `$lib/motion`: `pageTone`, `tonalScroll`, `lockScroll`, `jumpToAnchor`, `refreshMotion`. Also see
  how `src/routes/motion/+page.svelte` and `(platform)` use the tone layer.

## Decisions (made by the orchestrator, with the user's sign-off)

### Accent presets

The user signed them off:

- **Remove `clay`** from the registry. It reads as the terracotta look DESIGN.md rules out.
- **Keep `forest`** as the default, and **keep `tide`**, now confirmed rather than provisional.

Any stored `clay` key resolves to the default through the existing unknown-key fallback. Add a test
for that, and update the registry tests and the DATABASE.md note.

### Theme application

`view.theme` carries the accent's light and dark hex values. Set them as CSS custom properties on the
microsite root (`--color-accent`, `--color-accent-on-dark`, or whatever `layout.css` scopes per
tone), so every `text-accent-c` and the map pick them up.

- Set them **SSR-safe**, as an inline style on the root, with no flash.
- Font pairing has only the default for now, so wire the key through as a data attribute and leave
  the font as it is.
- Add a db or e2e test showing that a property switched to `tide` renders tide's hex.

### Microsite chrome

**Nav.** Reuse `Nav` and `NavMenu`; don't fork them. Extend them via props if needed.

- The wordmark is the **property name**. Keep a small "Ustay" mark somewhere quiet, such as the
  footer sign-off, so the microsite reads as the property's own site while staying unmistakably
  Ustay.
- The links are anchors to the **rendered** sections. Derive them from `view.sections`, so a
  disabled or dropped section has no link.
- The CTA is "Request to stay" → `#booking`, and only appears when the booking section is rendered.
- The nav flips tone with `pageTone` exactly as on the platform.
- Export one shared nav anchor offset constant and use it wherever the hero, sections or nav hard-code
  `-96`.

**Footer.** Reuse `Footer`, with property-scoped content: name, place label, a "Request to stay" link
when booking is rendered, the legal row, and a quiet "A Ustay stay" or similar sign-off linking to
`/`. Stay in the dark tone, closing the arc.

**Layout.** Put the chrome in the `(microsite)` layout or the `[slug]` page, whichever lets it read
the view model cleanly, with no second data fetch. Keep the skip link working.

### Tonal arc

Hero is dark, the editorial middle is light, and booking and the footer are dark again. Use
`tonalScroll` and `pageTone` the way the platform home does. The nav and any tone-aware pieces must
follow along. Under reduced motion and without JS the tones are static, and every section still
meets AA.

### Polish pass

Load `/s/rumah-kabus` at 1440 and 390 widths and fix inconsistencies between the sections that
different workers built:

- vertical rhythm and section padding;
- heading scale;
- numbered spines in order ("01" onwards);
- image treatment;
- reveal timing.

Keep each fix small and local, with no redesigns. List what you changed.

## Out of scope (don't)

- UST-62 (the platform home), new sections, the booking submission (Phase 6), the owner dashboard and
  font-pairing presets.
- Schema changes.

## Acceptance

- `/s/rumah-kabus`:
  - reads as one branded microsite with the nav, footer and tonal arc;
  - uses the forest accent applied from the view;
  - has nav anchors that scroll to the right sections, clearing the nav;
  - shows no console errors;
  - has no horizontal scroll at 390.
- e2e tests cover:
  - the nav anchors and the CTA;
  - the accent variable;
  - a property with booking disabled having no CTA in the nav, hero or footer;
  - the existing microsite flows still passing.
- The Svelte MCP autofixer is clean.
- `check`, `lint` and your own test files pass locally. CI must pass all three jobs.

## Machine limits (important)

The user's laptop is memory-constrained, and **a dev server is already running on 5173 for the
user**. Don't use 5173 and don't stop that server.

- Locally, run `check`, `lint`, your own test files and stories, and targeted db or e2e specs only;
  CI runs the full suite.
- For visual checks, use one short-lived preview on another port. Stop it right away and leave
  nothing running.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup.

- Branch `ust-31-assembly`.
- Stage explicit paths only; never `git commit -a`.
- The commit trailer names the model actually running.
- Move Linear UST-31 from In Progress to Done.
- Open a PR to `main`, but don't merge it and don't edit `WORKFLOW.md`.
- Poll `gh pr checks <n>` until all jobs finish. If a job fails, read
  `gh run view <id> --log-failed` and fix the cause.

## Report back to orchestrator

- The PR link and the CI result.
- What the chrome looks like.
- The polish fixes, as a list.
- Screenshot paths at desktop and phone widths, saved in the scratchpad.
- Deviations and new-issue candidates.
