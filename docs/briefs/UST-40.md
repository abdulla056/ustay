# Worker Brief — UST-40: CI workflow — check / lint / test on every PR

Linear: https://linear.app/abdulla-safar/issue/UST-40/ci-workflow-check-lint-test-on-every-pr

## Mission

The house-rule green gates (`bun run check`, `bun run lint`, `bun run test`) are currently
honour-system — there is no `.github/` directory at all. Add a GitHub Actions workflow so every PR
to `main` proves the gates itself.

## Read first (in the repo)

- `package.json` — the `check` / `lint` / `test` scripts and the bun toolchain.
- `vite.config.ts` — the vitest projects: a client project (Playwright browser mode) and the
  Storybook stories project. **Gotcha:** the browser/storybook tests need Playwright chromium —
  UST-7's worker had to run `bunx playwright install chromium` locally. CI needs the same (with
  browser caching if easy).

## Scope (do)

- [ ] `.github/workflows/ci.yml` running on `pull_request` to `main` (and `push` to `main`):
  - `oven-sh/setup-bun`, `bun install --frozen-lockfile`
  - `bun run check`, `bun run lint`, `bun run test` (install Playwright chromium first)
  - Sensible caching (bun cache, Playwright browsers) if straightforward — don't gold-plate.
- [ ] No database service — the default test gate runs without Postgres by design
      (see `docs/DATABASE.md`; the DB integration lane is UST-41, out of scope).
- [ ] Verify the workflow actually passes on your own PR before finishing.
- [ ] Document the Playwright-chromium requirement for local dev in `README.md` (one line under
      setup) — it currently surprises new checkouts.

## Out of scope (don't)

- No deploy/preview workflows, no release automation, no DB integration lane (UST-41).
- Don't add status-check branch-protection rules (repo settings, not code) — mention it in the
  report instead.

## Acceptance

- CI runs and passes on the PR for this branch; all three gates enforced.
- `bun run check` / `lint` / `test` green locally too.

## House rules

See `docs/briefs/WORKFLOW.md`. Branch `ust-40-ci` off latest `main`. Linear UST-40
In Progress → Done. Commit `UST-40: <summary>` + trailer
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Push, open a PR to `main`, don't merge.

## Report back to orchestrator

PR link, CI run link/status, anything flaky, and whether branch protection should be turned on.
