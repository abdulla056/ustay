# Worker Brief — UST-10: Seed / dev-data infrastructure

Linear: https://linear.app/abdulla-safar/issue/UST-10/seed-dev-data-infrastructure

## Mission

Build the _harness_ for seeding local/dev data — the runner, conventions, and reset story — so
that when Phase 1 lands domain tables, seeding a realistic property (UST-20) is a data problem,
not an infrastructure problem. Right now the only tables are better-auth's; the harness must
prove itself by seeding a dev user.

## Read first (in the repo)

- `docs/DATABASE.md` — the conventions; note `db:push` is local-only and the integration-test
  rule (nothing needing Postgres runs in the default `bun run test` gate).
- `src/lib/server/db/` — `index.ts` (client), `helpers.ts`, `auth.schema.ts` (generated).
- `src/lib/server/auth.ts` + better-auth docs — the correct way to create a user + credential
  account server-side (use better-auth's API so password hashing matches; never hand-insert
  into the auth tables).
- `compose.yaml`, `.env.example`, `package.json` scripts.

## Scope (do)

- [ ] A seed runner: `bun run db:seed` → `scripts/seed.ts` (or `src/lib/server/db/seed/index.ts`
      — pick per ARCHITECTURE.md and document). Idempotent (safe to re-run; upsert or
      check-then-create), clearly `NODE_ENV`-guarded so it can never run against production.
- [ ] `bun run db:reset` — drop/recreate the local database (or truncate + re-migrate), then
      seed. Local-only guard like `db:push`.
- [ ] Seed a **dev user** through better-auth (e.g. `owner@ustay.test` / documented password) —
      proves the harness and gives UST-55/57 a login to test against.
- [ ] Structure for growth: a `seeds/` convention where Phase 1 adds per-domain seed modules
      (document the pattern; the dev user is the first module).
- [ ] Document in `docs/DATABASE.md` (new "Seeding" section) + one line in `README.md` setup.
- [ ] Unit-test what's DB-free (guards, idempotency helpers); anything needing Postgres stays
      out of the default gate per the house rule.

## Out of scope (don't)

- No domain tables or domain seed data (Phase 1 / UST-20). No faker-style dep unless genuinely
  needed — if you add any dep, flag it prominently in the report (nothing else this wave touches
  package.json, so a lockfile change is mergeable but must be deliberate).

## Acceptance

- From a fresh checkout: `bun run db:start` → `db:reset` → signing in as the dev user works
  (verify via better-auth API or a session check; UI forms don't exist yet).
- Re-running `db:seed` changes nothing (idempotent). Production guard demonstrably refuses.
- `bun run check` / `lint` / `test` green; CI green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md` (incl. fresh-worktree setup). Branch `ust-10-seed-infra` off
latest `main`. Linear UST-10 In Progress → Done (tick its checklist if present). Push, open a
PR to `main`, don't merge.

## Report back to orchestrator

PR link, the seed/reset commands + file layout, how the dev user is created, any deps added,
gate/CI results, new-issue candidates.
