# Worker Brief — UST-49: Auth route protection in hooks.server.ts

Linear: https://linear.app/abdulla-safar/issue/UST-49/auth-route-protection-in-hooksserverts

## Mission

Implement the authorisation boundary `docs/ARCHITECTURE.md` promises: session resolution and
route-group protection in the `handle` hook — **not** in layout `load`s, which don't run before
form actions and therefore leave every `POST` open while looking secure. This must exist before
`(dashboard)` gets any real pages.

## Read first (in the repo)

- `docs/ARCHITECTURE.md` — the documented request flow and route-group strategy.
- `src/hooks.server.ts` (current state), `src/lib/server/auth.ts` (better-auth config),
  `src/app.d.ts` (`App.Locals` typing).
- `src/routes/(dashboard)/README.md` + `(auth)/README.md` — the groups being guarded.
- better-auth docs for SvelteKit `handle` integration + `auth.api.getSession`.

## Scope (do)

- [ ] In `hooks.server.ts`: resolve the better-auth session once per request into typed
      `event.locals` (`locals.session`, `locals.user` — type them in `app.d.ts`).
- [ ] Route-group protection keyed on `event.route.id`: - `(dashboard)` → no session ⇒ redirect to `/sign-in` (preserve the intended destination,
      e.g. `?redirectTo=`, validated to be a local path — no open redirects). - `(auth)` → active session ⇒ redirect away (to `/dashboard`). - Everything else public.
- [ ] Extract the guard decision into a pure, unit-testable function in `$lib/server` (given a
      route id + session state → allow / redirect target); test it without a database. Any test
      needing real better-auth/Postgres is out of the default gate (see `docs/DATABASE.md` rule).
- [ ] Minimal placeholder pages so redirects resolve: bare `/sign-in` page in `(auth)` and a bare
      `/dashboard` page in `(dashboard)` (a `Heading` + one line, primitives only, no forms —
      real auth UI is its own future issue).
- [ ] Compose with better-auth's own handler if one belongs in `handle` (check
      `src/lib/server/auth.ts` / existing setup for how the auth API routes are served; use
      `sequence()` if you end up with multiple handles).

## Out of scope (don't)

- No sign-in/sign-up forms or auth UI beyond the bare placeholders. No role/ownership model
  (owner-of-property checks are Phase 1). No changes to `src/lib/components/`, `src/lib/motion/`,
  or `(platform)` pages — **UST-46 and UST-50 are working those files in parallel.** No dep changes.

## Acceptance

- Anonymous request to `/dashboard` redirects to `/sign-in?redirectTo=/dashboard`; signed-in
  request to `/sign-in` redirects to `/dashboard`; public routes untouched. Guard logic covered
  by DB-free unit tests.
- `bun run check` / `lint` / `test` green; `bun run build` succeeds; CI green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md` (incl. fresh-worktree setup). Branch `ust-49-auth-guard` off latest
`main`. Validate any `.svelte` with the Svelte MCP autofixer. Linear UST-49 In Progress → Done.
Commit `UST-49: <summary>` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
Push, open a PR to `main`, don't merge.

## Report back to orchestrator

PR link, the guard API + `Locals` shape, how better-auth's handler is composed, anything about
session cost per request (caching?), and new-issue candidates (auth UI is an expected one).
