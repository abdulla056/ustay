# Worker Brief — UST-58: Primitive API refinements, round 2

Linear: https://linear.app/abdulla-safar/issue/UST-58/primitive-api-refinements-round-2

## Mission

Five small API fixes to the primitives in `src/lib/components/`, while the library is small. The
orchestrator has made every design decision below — implement them as written; do not redesign.

## Read first (in the repo)

- `src/lib/components/Stack.svelte` lines ~44–55 — the existing dev-only class-collision warning.
  Same pattern lives in `Grid.svelte`.
- `Card.svelte`, `Eyebrow.svelte`, `Section.svelte`, `Text.svelte`, `Image.svelte`, `Label.svelte`
  (Label shows how `as` was extended in UST-50).
- `docs/ARCHITECTURE.md` → "`components/` vs `features/`".

## Scope (do) — exact decisions

1. **Card `headingLevel`**: add `headingLevel?: 2 | 3 | 4 | 5 | 6`, default `3`, passed to the
   inner `<Heading level={...}>` (currently hard-coded `level={3}`). Add a story showing level 4.
2. **Eyebrow `as`**: widen to `'p' | 'span' | 'div' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'`. Default
   stays `p`. Visual styling unchanged regardless of tag. Add a story.
3. **Prop-vs-class collisions** — rule: _props own their properties_.
   - Create `src/lib/components/dev.ts` exporting
     `warnClassCollision(component: string, className: unknown, pattern: RegExp, hint: string): void`
     which flattens `className` (`[className].flat(9).join(' ')`), and if `pattern` matches, calls
     `console.warn(\`[${component}] ${hint}\`)`. It does nothing unless `import.meta.env.DEV`.
   - Refactor `Stack` and `Grid` to use it (keep their exact regexes and messages).
   - Add it (inside `if (import.meta.env.DEV) { $effect(() => ...) }`, same as Stack) to:
     `Text` (pattern for `text-<size>` and `text-<colour>` utilities that the `size`/`tone` props
     generate — match the actual token names used in Text's maps), `Section` (`py-`/`pt-`/`pb-`
     when `space !== 'none'`), `Image` (`rounded-` when the `rounded` prop is set).
   - Unit test `dev.ts` (vitest, spy on `console.warn`): warns on match, silent on no match,
     handles arrays/undefined `className`.
   - Add one paragraph to `docs/ARCHITECTURE.md` under "`components/` vs `features/`" stating the
     rule: a prop-generated utility must not also be passed via `class`; dev builds warn.
4. **Stories dogfood layout**: in every `*.stories.svelte`, replace raw
   `<div class="flex flex-col gap-*">` / `flex gap-*` layout wrappers with `Stack` (map gaps to
   Stack's `gap` prop values). Leave non-layout divs alone.
5. **Section landmark**: add `label?: string`. If `label` is given → render `<section aria-label={label}>`.
   If neither `label` nor `aria-label`/`aria-labelledby` (in `rest`) is present → render `<div>`
   instead of `<section>` (use `<svelte:element this={...}>`). Everything else unchanged. Update
   the Section story + add a test that unnamed renders `div`, labelled renders `section`.

Storybook gotcha: `@storybook/addon-svelte-csf` crashes if a `<Story>` has both a leading HTML
comment and `parameters.docs.description.story` — use the comment only.

## Out of scope (don't)

- No new components, no visual/token changes, no changes outside `src/lib/components/` and the one
  ARCHITECTURE.md paragraph. Don't touch `package.json`, `src/app.d.ts`, routes, motion.

## Acceptance

- All five items done as specified; Svelte MCP autofixer clean on every changed `.svelte`.
- `bun run check`, `bun run lint`, `bun run test` green; CI green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md` (incl. fresh-worktree setup). Branch `ust-58-primitives-round-2`.
Commit trailer: `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`. Linear UST-58 In
Progress → Done (tick checklist). Push, open PR to `main`, don't merge. Poll `gh pr checks <n>`
until CI finishes — don't wait for a notification.

## Report back to orchestrator

PR link, CI result, anything you couldn't do as specified and why.
