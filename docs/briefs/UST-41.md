# Worker Brief — UST-41: DB integration-test lane

Linear: https://linear.app/abdulla-safar/issue/UST-41/db-integration-test-lane-against-compose-postgres

## Mission

Phase 1 has shipped tables and repositories (property, slug redirects, rooms) that have **never been
tested against Postgres**. Build a separate integration-test lane, `bun run test:db`, that runs real
queries against the local compose Postgres. Wire it into CI with a Postgres service container, and
use it to cover what already exists. This issue needs judgment (vitest projects, SvelteKit `$env`
resolution, migrations in tests), so it's assigned to a Sonnet worker.

## Environment

Postgres is available locally now through Colima + Docker. `docker compose up -d` starts the
`compose.yaml` db (`postgres://root:mysecretpassword@localhost:5432/local`). Run `colima start` if
the Docker daemon isn't up.

## Read first (in the repo)

- `docs/DATABASE.md` (rule: nothing needing Postgres runs in default `bun run test`),
  `docs/ARCHITECTURE.md` → Tests + Data access.
- `vite.config.ts` (existing `client` + `server` vitest projects), `.github/workflows/ci.yml`.
- `src/lib/server/db/` (schema files, `index.ts`, `seed/`), `src/lib/server/property/*.repo.ts`,
  `drizzle/`.

## Decisions (made by the orchestrator)

- **File convention:** `*.db.test.ts`. The default `server` project must **exclude** them; a new
  vitest project named `db` includes only them. `bun run test` stays DB-free.
- **Script:** `"test:db": "vitest run --project db"`.
- **Isolated database:** tests run against a separate database, `ustay_test`, on the same server,
  never `local`. The connection string comes from `TEST_DATABASE_URL`; if it's unset, derive it from
  `DATABASE_URL` by swapping the db name. A global setup creates the db if missing and applies the
  committed migrations (`drizzle/`) programmatically with drizzle's migrator. That way the tests also
  check that the migrations apply cleanly from zero. Refuse to run unless the host is local or
  `CI=true` (reuse or mirror the seed guard).
- **Isolation between tests:** truncate every table in `public`, discovered from `pg_tables` rather than listed by hand so new tables are covered automatically (`TRUNCATE … RESTART IDENTITY CASCADE`),
  in a `beforeEach`, or wrap each test in a transaction that rolls back. Pick one and document it.
  Run the db project with `fileParallelism: false`.
- **CI:** add a second job, `db integration`, to `ci.yml` with a `postgres:17` service container
  (health-checked), running `bun run test:db`. It's separate from the existing `check / lint / test`
  job, so it doesn't slow that one down.

## Scope (do)

1. The lane: vitest project, global setup, helpers (`src/lib/server/test/db.ts` or similar), script,
   and CI job.
2. **Tests for what exists:**
   - `property.repo.db.test.ts`:
     - `insertProperty` generates a slug;
     - a colliding name gets a suffixed slug;
     - `renameProperty` writes a redirect;
     - `findRedirectedSlug` resolves it;
     - renaming back restores the old slug and removes that redirect row;
     - retired slugs aren't reused by a new property;
     - `publishProperty` sets status + `publishedAt`;
     - the currency check rejects `'myr'` and `'MYRR'`;
     - deleting a property cascades its redirects.
   - `room.repo.db.test.ts`:
     - `insertRoom` auto-increments `sortOrder` per property;
     - `listRoomsForProperty` ordering;
     - `reorderRooms` works, and throws when given another property's room id;
     - `updateRoom` with an empty patch;
     - the check constraints (`max_guests` 0, negative rate, `unit_count` 0) are rejected;
     - cascade on property delete.
   - `seed.db.test.ts`: the UST-10 happy path against `ustay_test`. Running the seed modules twice is
     idempotent (the second run reports skipped/unchanged), and the dev user can sign in through
     better-auth's `signInEmail` (use the seed client's auth instance).
3. **Bug to fix (found by the orchestrator):** non-JS sign-in doesn't redirect. A plain
   `application/x-www-form-urlencoded` POST to `/sign-in` with valid credentials returns **200**
   (session cookie set, page re-rendered) instead of **303 → /dashboard**. The enhanced path
   (`x-sveltekit-action: true`) correctly returns `{type:"redirect",status:303}`. Find the cause
   (suspects: `sveltekitCookies` plugin / better-auth handler in `hooks.server.ts`, or how the
   action's `redirect()` interacts with them), fix it, and cover it with a test if one is practical
   (an integration test that POSTs to the action is fine). Also check `/sign-up`. Put this in its own
   commit.
4. Docs: a "Integration tests" subsection in `docs/DATABASE.md` (how to run, conventions,
   isolation choice) and the `test:db` row in the README scripts table. Remove the ⚠ "never run
   against live Postgres" caveats you make obsolete in `docs/` (the UST-10 line in
   `docs/briefs/WORKFLOW.md` is orchestrator-owned, so leave it).

## Out of scope (don't)

- Don't change schemas or migrations, or add tables (another worker is adding amenities this wave).
  If a test reveals a real repository bug, fix it minimally in the repo file and call it out in the
  report.
- No new runtime deps. Dev deps only if unavoidable; flag them.

## Acceptance

- `bun run test` is unchanged and still DB-free. `bun run test:db` is green locally against Colima.
- Both CI jobs green on the PR.
- The non-JS sign-in POST returns 303.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-41-db-test-lane`. Commit
trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Linear UST-41 goes In
Progress → Done. Push, open a PR to `main`, don't merge. Poll `gh pr checks <n>` until both jobs
finish.

## Report back to orchestrator

- PR link and CI result for both jobs.
- The isolation strategy you chose.
- The root cause and fix of the sign-in bug.
- Any repository bugs the tests found.
- New-issue candidates.
