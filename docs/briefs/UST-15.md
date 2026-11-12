# Worker Brief — UST-15: Host profile and property story

Linear: https://linear.app/abdulla-safar/issue/UST-15/model-hostprofile-and-property-story

## Mission

Storytelling is the core of Ustay (PROJECT_CONTEXT.md: hosts sell experiences, not rooms). Model the
two pieces of it: the **host** behind a property (name, bio, photo, hosting since) and the
**property's story** (its history, as long-form text). The microsite's Host and Story sections
(Phase 2) render from these.

## Read first (in the repo)

- `PROJECT_CONTEXT.md` (storytelling), `docs/DATABASE.md` (conventions and "Integration tests"),
  `docs/DECISIONS.md`, `docs/ARCHITECTURE.md` → Data access.
- `src/lib/server/db/property.schema.ts`, `media.schema.ts` (UST-14: note the composite
  `(property_id, id)` FKs and the hand-edited `ON DELETE SET NULL (col)` in `drizzle/0003_*.sql`),
  `relations.ts`, `src/lib/server/property/*.repo.ts` and their `*.db.test.ts`.

## Decisions (made by the orchestrator)

- **`host_profile` is 1:1 with a property.** `property_id` is both the primary key and an FK to
  `property` (cascade). One property, one host presentation. (A future "one owner, many properties"
  host identity is not modelled here; the owner account is `user`.)
- Columns: `display_name` (required, trimmed non-empty), `bio` (markdown text, nullable),
  `avatar_asset_id` (nullable), `hosting_since` (nullable integer year: CHECK `>= 1900` in the DB;
  the "not in the future" bound isn't a static CHECK, so validate it in the repo), `languages`
  (text[], default empty), plus `timestamps()`.
- **The avatar is a `media_asset` from the same property**: composite FK
  `(property_id, avatar_asset_id)` → `media_asset(property_id, id)` with
  `ON DELETE SET NULL (avatar_asset_id)` (hand-edit the SQL as UST-14 did, and comment it in the
  schema). The avatar must be an `image`; enforce that in the repo inside the transaction (lock the
  asset row `FOR UPDATE`, same pattern as the UST-14 poster check).
- **The property story lives on `property`**: two nullable columns, `story_heading` (text) and
  `story_body` (markdown text). Markdown is stored raw; rendering and sanitising are Phase 2's job (note
  that in DATABASE.md). No length limits in the DB beyond non-empty-when-present CHECKs.
- **Local recommendations are out of scope**: they move to UST-16 as attractions with a `host_note`.
  Update the UST-15 checklist in Linear to say so.
- Repository `src/lib/server/property/host.repo.ts`: `getHostProfile(propertyId)`,
  `upsertHostProfile(propertyId, input)` (insert or update in one statement or transaction; strips
  undefined fields and `propertyId` from the patch at runtime), `setHostAvatar(propertyId, assetId | null)`,
  `deleteHostProfile(propertyId)`. Story setters go in `property.repo.ts`:
  `setPropertyStory(propertyId, { heading, body })` (null clears). Malformed uuids give a typed
  not-found error, not a 500. Executor is the last parameter, `tx: Executor = db`.
- Relations: `property.hostProfile` (one), `hostProfile.avatar` (one media asset).
- Tests: schema-shape tests in the default gate; repo behaviour in `*.db.test.ts`:
  1:1 (second insert upserts), cascade on property delete, avatar cross-property rejection (DB and
  repo), avatar must be an image, avatar asset deletion nulls the column, `hosting_since` bounds,
  empty `display_name` rejected, story set/clear.
- One migration only. Follow the migration clash rule below.

## Out of scope (don't)

- No UI, routes, markdown rendering, seed data (UST-20) or local recommendations (UST-16).

## Acceptance

- Schema, migration, repos and tests as above. `bun run check`, `lint`, `test` and `test:db` green
  locally (Colima: `colima start`, `docker compose up -d`). CI green, all three jobs.
- `docs/DATABASE.md` documents the tables and the raw-markdown note.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-15-host-story`. Stage
explicit paths only, never `git commit -a`. The commit trailer names the model actually running.
Linear UST-15 goes In Progress → Done. Push, open a PR to `main`, don't merge. Poll
`gh pr checks <n>` until all jobs finish.

**Migration clash rule:** before opening the PR, `git fetch && git rebase origin/main`. If main
gained a migration after yours, delete yours (sql + snapshot + journal entry) and re-run
`bun run db:generate`, then re-apply the hand edit.

## Report back to orchestrator

PR link, CI result, migration name, hand edits to the SQL, deviations, new-issue candidates.
