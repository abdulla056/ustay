# Worker Brief — UST-77: End-to-end test lane (Playwright)

Linear: https://linear.app/abdulla-safar/issue/UST-77/end-to-end-test-lane-playwright-for-core-user-flows

## Mission

Nothing today loads real pages and clicks through them. Add a Playwright end-to-end lane that drives
the running app, backed by the UST-41 test database, both locally and in CI. Each page that Phase 2
adds then grows one flow here.

## Read first (in the repo)

- `docs/DATABASE.md` → "Integration tests" (UST-41: `ustay_test`, the guard, migrations from
  zero), `src/lib/server/test/*`, `vite.config.ts`, `.github/workflows/ci.yml` (the `db integration`
  job is the model for an e2e job).
- `src/hooks.server.ts`, `src/lib/server/auth-guard.ts`, `src/routes/(auth)/*`,
  `src/routes/(dashboard)/*`, `src/lib/server/db/seed/*`.
- `@playwright/test` may not be a dependency yet; the browser-mode vitest uses `playwright` itself.

## Decisions (made by the orchestrator)

- `bun run test:e2e` runs `@playwright/test` (dev dep is fine; flag it) against a **built** app
  (`vite build` + `vite preview`) through Playwright's `webServer`, pointed at `ustay_test`. Reuse
  UST-41's URL resolution + guard. A global setup applies migrations and seeds the dev user. Tests
  live in `e2e/`. Exclude them from vitest, `bun run test` and `test:db`.
- Chromium only. One desktop viewport plus one phone viewport project, for the mobile flows.
- CI: a third job, `e2e`, with a Postgres service, the same as `db integration`. Install
  browsers with `timeout 120 bunx playwright install --with-deps chromium || bunx playwright install chromium`
  (matches the gates job). Upload the Playwright report as an artifact on failure.
- **Flows:**
  1. Signed out, `/dashboard` goes to `/sign-in?redirectTo=%2Fdashboard`.
  2. Sign in as the seeded dev user, then land on `/dashboard`. Do it twice: JS enabled, and in a
     `javaScriptEnabled: false` context. The no-JS path must also end on `/dashboard`.
  3. A wrong password shows the error and stays on `/sign-in`.
  4. Sign up a fresh user (unique email per run), then `/dashboard`.
  5. Sign out from the dashboard, then signed out (`/dashboard` redirects again).
  6. Signed in, `/sign-in` goes to `/dashboard`.
  7. `/`, `/tokens`, `/motion` and `/prototype` return 200 with **no console errors** (collect
     `page.on('console')` errors and `pageerror`).
  8. Phone viewport: if `Nav` has the mobile menu toggle (UST-60 may have merged), open it, check
     `aria-expanded` and Esc closes. If the toggle isn't on main yet, `test.skip` with a note.
- Keep it fast and deterministic: no fixed sleeps, use web-first assertions. Share auth state via
  `storageState` where it helps.

## Out of scope (don't)

- No app code changes, unless a test exposes a real bug. If one does, fix it minimally in its own
  commit and flag it.
- No visual-regression screenshots yet (possible follow-up).

## Acceptance

- `bun run test:e2e` green locally (Colima Postgres: `colima start`, `docker compose up -d`).
  All three CI jobs green. `bun run test` is unchanged.
- `docs/ARCHITECTURE.md` Tests section and the README scripts table document the lane.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-77-e2e`. The commit
trailer names the model actually running. Linear UST-77 goes In Progress → Done. Push, open a PR to
`main`, don't merge. Poll `gh pr checks <n>` until all jobs finish. Port 5173 is in use by a dev
server, so use a different port for preview.

## Report back to orchestrator

PR link, CI results for all jobs, the deps added, any app bugs found, flake risks, new-issue
candidates.
