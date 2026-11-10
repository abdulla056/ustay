# Worker Brief — UST-76: build fails with default .env

Linear: https://linear.app/abdulla-safar/issue/UST-76/bun-run-build-fails-with-default-env-empty-better-auth-secret

## Mission

On a fresh checkout, copying `.env.example` to `.env` leaves `BETTER_AUTH_SECRET` empty, so
`bun run build` fails. Make the default dev setup build.

## Scope (do): exact decisions

1. In `.env.example`, set `BETTER_AUTH_SECRET` to the obviously fake, dev-only placeholder
   `dev-only-insecure-secret-change-me-0123456789abcdef`. Add a comment line above it:
   `# Dev only. Generate a real one for any deployed environment: openssl rand -base64 32`.
2. In the `README.md` setup section, add one line that says the same thing.
3. Check that `cp .env.example .env && bun run build` passes in your worktree.

## Out of scope (don't)

- Don't change any source code, auth config, CI, or `docs/` (another worker owns `docs/`).

## Acceptance

- Fresh `.env` from the example builds. `bun run check`, `bun run lint`, `bun run test` green; CI
  green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md`. Branch `ust-76-dev-auth-secret`. Commit trailer:
`Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`. Linear UST-76 goes In Progress → Done.
Push, open a PR to `main`, don't merge. Poll `gh pr checks <n>` until CI finishes.

## Report back to orchestrator

PR link, CI result.
