# Worker Brief — UST-16: Location, destinations and local attractions

Linear: https://linear.app/abdulla-safar/issue/UST-16/model-location-and-local-attractions

## Mission

Model where a property is and what's around it. That means three things:

- the property's **location** (address and coordinates);
- the **destination** it belongs to, which groups properties for traveller discovery (Phase 5, e.g.
  "Langkawi");
- the host's **local recommendations**: attractions, restaurants and places, each with the host's
  own note.

The microsite Location section (Phase 2) and discovery (Phase 5) build on it.

## Read first (in the repo)

- `PROJECT_CONTEXT.md` (local experiences, discovery), `docs/DECISIONS.md` (#7: Postgres-native
  search), `docs/DATABASE.md` (conventions, "Integration tests", the column-scoped SET NULL note),
  `docs/ARCHITECTURE.md` → Data access.
- `src/lib/server/db/property.schema.ts`, `host.schema.ts` and `media.schema.ts` (the composite
  `(property_id, id)` FK pattern), `helpers.ts` (`isUuid`), `relations.ts`.
- `src/lib/server/property/*.repo.ts`, in particular `assertImageInLibrary` in `media.repo.ts`, the
  typed errors and the `findPropertyById(id, tx, { lock: true })` pattern, plus their `*.db.test.ts`.

## Decisions (made by the orchestrator)

### `destination`

- Platform-curated, not per-owner. Columns:
  - `id()` and `slug()`, unique;
  - `name` (required, non-blank) and `region` (nullable);
  - `country_code` (ISO 3166-1 alpha-2, CHECK `^[A-Z]{2}$`);
  - `summary` (nullable text);
  - `timestamps()`.
- No media for now: destination imagery comes with Phase 5.

### `property_location`, 1:1 with a property

- `property_id` is the primary key, with an FK to `property` (cascade).
- Address columns:
  - `address_line1` and `address_line2`, both nullable;
  - `locality` (the town or city, required) and `region` (nullable);
  - `postal_code` (nullable);
  - `country_code` (required, same CHECK as `destination`).
- Coordinates: `latitude` and `longitude` as `double precision`, both nullable. CHECK both or
  neither, latitude in −90..90 and longitude in −180..180.
- `destination_id` is nullable, FK `ON DELETE SET NULL` (a single-column FK, so no hand edit), and
  indexed.
- **Privacy:** add `show_exact_location boolean not null default false`. Many homestays are the
  host's own home. Public pages show the locality and an approximate area unless the owner opts in.
  Record this in `docs/DECISIONS.md` as decision 8, dated today, with no revisit.
- No PostGIS. Plain columns are enough for the MVP. Distance search is Phase 5's job.

### `attraction`

- These are per-property local recommendations: the host's picks, so they're not shared between
  properties. Columns:
  - `id()`;
  - `property_id`, FK with cascade;
  - `name` (required, non-blank);
  - `category`, a `pgEnum` `attraction_category` with values `restaurant`, `cafe`, `beach`,
    `nature`, `culture`, `activity`, `shopping`, `nightlife`, `transport`, `other`;
  - `host_note` (nullable text: the host's voice, e.g. "Ask for Kak Ros's nasi lemak");
  - `travel_minutes` (nullable, positive integer) and `travel_mode` (`pgEnum` `travel_mode`: `walk`,
    `cycle`, `drive`, `boat`, `transit`; nullable). CHECK that both are set or neither is;
  - `distance_meters` (nullable, positive integer);
  - `url` (nullable, CHECK `^https?://`);
  - `latitude` and `longitude`, optional, with the same pair rules as `property_location`;
  - `media_asset_id`: an optional image. Use a composite FK
    `(property_id, media_asset_id)` → `media_asset(property_id, id)` with
    `ON DELETE SET NULL (media_asset_id)`, hand-edited in the SQL as UST-14 and UST-15 did. It must
    be an image: use `assertImageInLibrary`. Also extend the `updateMediaAsset` kind-change guard to
    cover attraction images;
  - `sort_order`;
  - `timestamps()`;
  - an index on `(property_id, sort_order)`.

### Repositories

- `src/lib/server/property/location.repo.ts`:
  - `getPropertyLocation`;
  - `upsertPropertyLocation`, which trims, validates country codes and the coordinate pair, and turns
    blank strings into null;
  - `setPropertyDestination(propertyId, destinationId | null)`.
- `src/lib/server/destination/destination.repo.ts`:
  - `createDestination`, `findDestinationBySlug`, `listDestinations`, `updateDestination`,
    `deleteDestination`;
  - `listPublishedPropertiesInDestination(destinationId)`, which returns only `published`
    properties.
- `src/lib/server/property/attraction.repo.ts`:
  - `listAttractions(propertyId)`, ordered;
  - `insertAttraction`, `updateAttraction` and `deleteAttraction`;
  - `setAttractionOrder(propertyId, ids[])`, which locks the property and rejects ids from other
    properties;
  - `setAttractionImage(attractionId, assetId | null)`.
- Follow the UST-15 hardening rules:
  - malformed uuids give typed not-found errors or `undefined`;
  - wrong types and blank required text give typed validation errors, never raw Postgres codes;
  - patches are stripped of undefined fields and of `propertyId`/`id` at runtime;
  - the executor is the last parameter.

### Relations and tests

- Relations:
  - `property.location` (one) and `property.attractions` (many);
  - `location.destination`;
  - `destination.locations`;
  - `attraction.image`.
- Tests: schema-shape tests in the default gate. Repository behaviour goes in `*.db.test.ts`:
  - location 1:1 upsert and cascade;
  - the coordinate pair and range checks, at both the DB and repo level;
  - the country-code check;
  - destination delete nulls the location's destination;
  - published-only listing;
  - attraction ordering and the cross-property rejection;
  - the travel pair check;
  - the attraction image must be an image from the same library, and deleting the asset nulls the
    column;
  - the kind-change guard.
- One migration only, following the migration clash rule below.

## Out of scope (don't)

- No UI, routes, maps, geocoding, distance search or seed data (UST-20 seeds a full property).
- No changes to `host_profile`.

## Acceptance

- Schema, migration, repositories and tests as above.
- `bun run check`, `lint`, `test` and `test:db` green locally (Colima). CI green on all three jobs.
- Run `bun run db:reset` locally and confirm it applies cleanly.
- `docs/DATABASE.md` documents the tables, and `docs/DECISIONS.md` gains decision 8.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-16-location`. Stage
explicit paths only, never `git commit -a`. The commit trailer names the model actually running.
Linear UST-16 goes In Progress → Done. Push, open a PR to `main`, don't merge. Poll
`gh pr checks <n>` until all jobs finish.

**Migration clash rule:** before opening the PR, `git fetch && git rebase origin/main`. If main
gained a migration after yours, delete yours (sql + snapshot + journal entry) and re-run
`bun run db:generate`, then re-apply the hand edit.

## Report back to orchestrator

PR link, CI result, migration name, hand edits to the SQL, deviations, new-issue candidates.
