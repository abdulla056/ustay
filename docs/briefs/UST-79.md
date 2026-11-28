# Worker Brief — UST-79: Destination slug renames keep old links working

Linear: https://linear.app/abdulla-safar/issue/UST-79/destination-slug-renames-need-a-redirect-table

## Mission

Decision 1 says a renamed slug must keep its old links working, through a redirect table. Properties
already do this with `property_slug_redirect` and `renameProperty`. Destinations (UST-16) don't yet.
Bring destinations up to the same standard, so Phase 5's `/destinations/<slug>` pages can 301 from old
slugs.

## Read first (in the repo)

- `docs/DECISIONS.md` (#1), `docs/DATABASE.md` (slugs, destinations, and the hardening patterns).
- `src/lib/server/db/property.schema.ts` (`property_slug_redirect`),
  `src/lib/server/property/property.repo.ts`: `renameProperty`, `findRedirectedSlug` and
  `findRedirectTarget`. **Mirror these.**
- `src/lib/server/db/destination.schema.ts` (or wherever `destination` lives),
  `src/lib/server/destination/destination.repo.ts`, its db tests, and `src/lib/server/db/slug.ts`.

## Decisions

- Add a new table, `destination_slug_redirect`. It mirrors `property_slug_redirect`:
  - `old_slug` is unique;
  - `destination_id` cascades on delete;
  - it has `timestamps()`.
- Add a single-statement lookup, `findDestinationRedirectTarget(oldSlug)`, that returns the current
  slug.
- Add `renameDestination(id, newName, { newSlug? })`. It mirrors `renameProperty`:
  - It runs in one transaction.
  - It slugifies the new slug, validates it and checks it's unique.
  - It writes the redirect row for the old slug.
  - It handles renaming back to one of the destination's own retired slugs, which removes that
    redirect row, as the property code does.
  - It raises typed errors and never a raw 23505.
- A destination slug must never equal another destination's live slug or a retired slug owned by a
  different destination. Enforce this in the repo and test it.
- Add db tests covering:
  - rename and redirect;
  - chained renames, where A→B→C means both A and B resolve to C;
  - renaming back;
  - collisions;
  - cascade on delete.
- One migration only. Follow the migration clash rule below.

## Out of scope

No routes (Phase 5) and no UI.

## Acceptance

- The schema, migration, repo and tests are in.
- `check`, `lint`, your own test files and `bun run test:db` pass. Postgres is already running on 5432.
- CI passes all three jobs.
- `docs/DATABASE.md` is updated.

## Machine limits

The laptop is memory-constrained, and a dev server for the user is running on 5173. Don't touch it.

- Run only targeted tests locally.
- No servers.
- Use a scratch database for any `db:reset` check, not `local`.

## House rules

See `docs/briefs/WORKFLOW.md`.

- Branch `ust-79-destination-redirects`.
- Stage explicit paths only.
- The commit trailer names the model actually running.
- Linear UST-79 goes In Progress → Done.
- Open a PR and don't merge it.
- Poll CI; if a job fails, read the log and fix the cause.

**Migration clash rule:** before opening the PR, run `git fetch && git rebase origin/main`. If main
gained a migration after yours, delete yours (sql + snapshot + journal) and re-run
`bun run db:generate`.

## Report back

PR link, CI result, migration name, deviations.
