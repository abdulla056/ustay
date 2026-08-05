# Worker Brief — UST-9: Project architecture & app packaging
Linear: https://linear.app/abdulla-safar/issue/UST-9/project-architecture-and-folder-structure

## Mission
Establish where things live so the codebase scales — and convert the repo from the SvelteKit
**library** template it was scaffolded as into a proper **app** (Ustay is an app, not a
publishable package).

## Read first (in the repo)
- `package.json` — note the library-template fields: `svelte-package`/`prepack`/`publint` in
  `build`, plus `files`, `svelte`, `types`, `exports`, `peerDependencies`. These are for
  publishing a library and are dead weight for an app.
- `src/` layout, `svelte.config`/`vite.config.ts`, `CLAUDE.md` + project memory

## Scope (do)
- [ ] Convert to an app: drop the library packaging from `package.json` (the `svelte-package`
      prepack step, `files`/`svelte`/`types`/`exports`/`peerDependencies`, the `keywords`),
      simplify the `build` script. Ensure `bun run build` still works with the Cloudflare adapter.
- [ ] Define + document the **`$lib` structure** (server vs client, features/domains, `components`,
      `ui`) and a **route-group strategy** (public site, microsite, dashboard, auth). Scaffolding
      empty route groups is fine; don't build features.
- [ ] Define **data-access / repository layer** conventions.
- [ ] Document it all in `docs/ARCHITECTURE.md` (and/or a short pointer in `CLAUDE.md`).

## Out of scope (don't)
- Don't build features, components, or domain models.
- Don't add runtime deps (avoids `package.json` conflicts with UST-6). If unavoidable, flag it.

## Acceptance
- `package.json` is app-shaped; `bun run build` succeeds (Cloudflare adapter).
- Architecture + route-group strategy documented; empty group scaffolding compiles.
- `bun run check` / `lint` / `test` all green.

## House rules
See `docs/briefs/WORKFLOW.md`. Branch `ust-9-architecture` off `main`; Linear UST-9
In Progress → Done; commit with the Co-Authored-By trailer; push, open a PR to `main`, don't merge.
NOTE: this edits `package.json` — don't run at the same time as UST-6 (also edits it).

## Report back to orchestrator
PR link, the final `$lib`/route-group structure, and any packaging surprises.
