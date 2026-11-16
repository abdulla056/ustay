# Database conventions

Postgres + [Drizzle ORM](https://orm.drizzle.team). These conventions are locked **before** the
domain is modelled, so every table added in Phase 1 and after looks the same. If you need to break
one, change this document in the same PR.

## Where things live

| Path                               | What it is                                                        |
| ---------------------------------- | ----------------------------------------------------------------- |
| `src/lib/server/db/index.ts`       | The `db` client. The only place `DATABASE_URL` is read.           |
| `src/lib/server/db/schema.ts`      | App schema + the entry point `drizzle.config.ts` points at.       |
| `src/lib/server/db/auth.schema.ts` | **Generated** by better-auth (`bun run auth:schema`). Never edit. |
| `src/lib/server/db/helpers.ts`     | Shared column helpers — `id()`, `timestamps()`, `slug()`, …       |
| `src/lib/server/db/slug.ts`        | `slugify()` / `uniqueSlug()` for public URLs.                     |
| `drizzle/`                         | Generated SQL migrations + journal. Committed.                    |

Anything a table needs from another table must be importable without importing `index.ts` —
`helpers.ts` and `slug.ts` deliberately have no `$env` dependency, so they are unit-testable with
no database running.

## Identifiers

**Every app table uses a database-generated UUID primary key** via `id()`
(`uuid('id').primaryKey().defaultRandom()` → `gen_random_uuid()`).

| Option              | Why not                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `serial` / `bigint` | Sequential ids in URLs leak row counts and growth rate, and let anyone walk `/bookings/41` → `/bookings/42`. Ustay's ids appear in guest-facing URLs and API payloads. |
| UUID (chosen)       | 16 bytes instead of 4 and no natural ordering — irrelevant at our scale.                                                                                               |
| ULID / UUID v7      | Time-sortable, but needs an extension or app-side generation. Revisit only if a hot table's index locality actually hurts.                                             |

Rules:

- Order by `createdAt`, never by id — UUID v4 carries no time information.
- Foreign keys to app tables: `uuidRef('<entity>_id')`, always with an explicit `onDelete`.
- "Must belong to the same parent" rules (a placement may only use an asset from its own
  property's library) are enforced with a **composite foreign key**: the target exposes a
  `unique(<parent>_id, id)` key and the child references the pair. See `media.schema.ts` (UST-14).
  Name composite FKs explicitly (`<table>_<target>_fk`); the generated names pass 63 characters.
  `drizzle-kit` may emit the target's `ADD CONSTRAINT … UNIQUE` after the FK that needs it when the
  target table already exists, so read the SQL and move it up.
- Foreign keys to the auth user: `userRef()`. better-auth mints its own **text** ids, so a user
  reference can never be a `uuid` column.
- A natural key (ISO country code, currency code) may be the primary key of a small immutable
  lookup table. Prefer that over a UUID plus a redundant unique constraint.

## Naming

- **Tables**: singular, `snake_case` — `property`, `property_photo`, `booking`. This matches the
  auth tables (`user`, `session`, `account`, `verification`), which we do not control.
- **Columns**: `snake_case` in Postgres, `camelCase` in TypeScript. Always pass the name explicitly
  — `createdAt: timestamp('created_at')` — rather than relying on a casing config.
- **Booleans**: `is_` / `has_` prefix — `is_published`, `has_parking`.
- **Timestamps**: `_at` suffix — `created_at`, `published_at`, `cancelled_at`.
- **Foreign keys**: `<referenced_table>_id`, or a role-qualified name when the role matters
  (`host_id`, `guest_id`).
- **Enums**: `pgEnum('booking_status', [...])` — singular snake_case type name, lowercase values.
  Export as `bookingStatus`. Adding a value is cheap; removing one is a migration, so keep enums
  for genuinely closed sets and use a lookup table for anything editable by staff.
- **Indexes**: `<table>_<column>_idx`, matching the generated auth indexes
  (`session_userId_idx`). Composite: `<table>_<col1>_<col2>_idx`.
- **Relations**: one `relations()` export per table, named `<table>Relations`.
- **Money**: integer **minor units** plus an ISO-4217 currency column — `nightly_rate_minor`,
  `currency`. Never `float`, and never read `numeric` into a JS number. Currency is per property
  (`property.currency`); see `docs/DECISIONS.md` for money rules.
- **Wall-clock vs instants**: `timestamps()` and other `_at` columns are `timestamptz` (an absolute
  instant). A check-in date or a property's local calendar is _not_ an instant — model it as `date`
  / `time` plus the property's IANA timezone, or you will ship off-by-one-day bugs.

## Shared columns

```ts
import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { id, slug, timestamps, userRef, uuidRef } from './helpers';

export const property = pgTable(
	'property',
	{
		id: id(),
		slug: slug(),
		name: text('name').notNull(),
		hostId: userRef('host_id').notNull(),
		destinationId: uuidRef('destination_id')
			.notNull()
			.references(() => destination.id, { onDelete: 'restrict' }),
		nightlyRateMinor: integer('nightly_rate_minor').notNull(),
		currency: text('currency').notNull(),
		...timestamps()
	},
	(table) => [index('property_destination_id_idx').on(table.destinationId)]
);
```

- `timestamps()` gives `createdAt` + `updatedAt` (`timestamptz`, `defaultNow()`, and `updatedAt`
  refreshed by Drizzle's `$onUpdate`). Spread it into **every** table.
- Because `$onUpdate` is application-side, raw SQL that bypasses Drizzle will not bump
  `updatedAt`. If that ever matters for a table, add a Postgres trigger in a migration.
- Helpers are functions, not shared objects, so each table gets fresh column builders.
- `deletedAt()` exists for soft deletes but is **opt in** — every read on such a table has to
  filter `isNull(deletedAt)`. Prefer a hard delete unless booking history or audit requires the row.
- `src/lib/server/db/helpers.test.ts` holds the reference table these conventions are asserted
  against. It is not exported from `schema.ts`, so it never reaches a migration.

## Slugs

Public URLs are slugs, not ids: `/stays/riad-el-fenn`, `/destinations/marrakech`.

- The slug is a **stored column** (`slug()` → required + unique), not derived at read time.
  Renaming a property must not silently break every link to it.
- Generate with `uniqueSlug(name, isTaken)` from `./slug`: `slugify()` folds diacritics, drops
  apostrophes, collapses everything else to single hyphens, and truncates to 80 characters on a
  word boundary. Collisions get a random 6-character base36 suffix (`riad-el-fenn-7bq2xf`) rather
  than a `-2` counter, which would advertise how many similar listings exist.
- `uniqueSlug` is advisory — two concurrent writers can both see a free slug. The unique constraint
  is the real defence: catch the unique violation and retry.
- Slugs are unique **per table**, and are never reused after a rename. Renames write a
  `<table>_slug_redirect` row (`old_slug` → `property_id`, cascade on delete), and routes answer the
  old slug with a 301 to the current one (route work is UST-21). Slug lookups stay a plain equality
  (`docs/DECISIONS.md` #1).
- Never trust a slug from the client as an identifier for a write. Resolve it to a row, then
  authorise against that row's id.

## Migration workflow

Two modes, and mixing them is what corrupts a shared database:

| Command               | When                                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run db:push`     | **Local only.** Diffs the schema straight onto your dev database, no SQL file. Fast loop while a table is still in flux; expect to drop data. |
| `bun run db:generate` | Writes a reviewable SQL migration into `drizzle/`. Run this once the shape settles, and commit the SQL with the schema change in the same PR. |
| `bun run db:migrate`  | Applies pending migrations from `drizzle/`. This is how any shared or deployed database changes.                                              |
| `bun run db:studio`   | Browse the local database.                                                                                                                    |

Rules:

- **Never** `db:push` against a shared or production database.
- `db:push` cannot express the column-scoped `ON DELETE SET NULL (col)` hand-edited into the
  media poster FK (`0003`) and the host avatar FK (`0004`): it creates a plain `SET NULL`, and
  deleting a poster or avatar asset then tries to null `property_id` and fails. The migrations
  are the source of truth for those FKs, so use `db:reset` (which applies them) or `db:migrate`
  on any database where you delete assets.
- Generated SQL is committed and, once merged, immutable. To fix a bad migration, add another.
- Read the generated SQL before committing. `drizzle-kit` is configured with `strict: true`, so a
  rename it cannot tell from a drop/create will ask — a wrong answer here is data loss.
- Destructive changes ship in two steps: add the new column and backfill in one migration, drop the
  old one in a later PR once nothing reads it.
- Auth tables are generated: change `src/lib/server/auth.ts`, then
  `bun run auth:schema && bun run db:generate`. Never hand-edit `auth.schema.ts` — the next
  regeneration will overwrite it.
- `DATABASE_URL` must be set for any `db:*` command (`drizzle.config.ts` throws otherwise). Start
  the local database with `bun run db:start` (see `compose.yaml`); copy `.env.example` to `.env`.

## Media URLs (UST-20)

- **`media_asset.url`** is an `http(s)://` URL or a site-relative path (`/prototype/x.jpg`, served
  from this app's `static/`), enforced by `media_asset_url_check` (`^(https?://|/[^/])`, migration
  `0009`). A protocol-relative `//host/x` is refused, because it resolves to another origin. The
  repo does not re-validate it; the database CHECK is the rule, and a bad value surfaces as
  Postgres error `23514`.

## Host and story (UST-15)

- **`host_profile`** is 1:1 with `property`: `property_id` is the primary key and a cascading FK.
  Columns: `display_name` (required, non-blank), `bio` (markdown, nullable, non-blank when
  present), `avatar_asset_id`, `hosting_since` (year, `>= 1900`; the "not in the future" bound is
  checked in `host.repo.ts`), `languages` (`text[]`, default empty).
- **The avatar** is an `image` in the same property's library: composite FK
  `(property_id, avatar_asset_id)` → `media_asset(property_id, id)` with the hand-edited
  `ON DELETE SET NULL (avatar_asset_id)` (see `drizzle/0004_*`), so deleting the asset clears only
  the avatar. "Is an image" is checked in `setHostAvatar`, with the asset row locked.
- **The property story** is `property.story_heading` and `property.story_body`, both nullable and
  non-blank when present (`setPropertyStory` in `property.repo.ts`).
- **Markdown is stored raw** (`bio`, `story_body`). Rendering and sanitising are the page layer's
  job (Phase 2); never trust or `{@html}` the stored text without sanitising it first.

## Location, destinations and attractions (UST-16)

- **Privacy is enforced in code (decision 8).** `getPropertyLocation` returns the full row and is
  owner/admin only. Public pages must use `getPublicPropertyLocation`: with
  `show_exact_location` off it returns only locality, region, country, destination and
  coordinates rounded to two decimals (about 1 km), with no address lines or postal code.
- **`destination`** is platform-curated (not per-owner): `slug` (unique), `name`, `region`,
  `country_code` (ISO 3166-1 alpha-2, CHECK `^[A-Z]{2}$`), `summary`. No media yet (Phase 5).
- **`property_location`** is 1:1 with `property` (`property_id` primary key, cascading FK). Address
  columns, `locality` and `country_code` required. Coordinates are plain `double precision`
  (no PostGIS) with a CHECK that both or neither are set, latitude in -90..90 and longitude in
  -180..180. `destination_id` is nullable, indexed, `ON DELETE SET NULL`.
- **Privacy:** `show_exact_location` defaults to false (decision 8). Public pages show the locality
  and an approximate area unless the owner opts in.
- **`attraction`** is a per-property host recommendation (not shared): `category` and `travel_mode`
  are enums, `host_note` is the host's voice, `travel_minutes` and `travel_mode` are set together
  or not at all, `url` must be `http(s)://`, optional coordinate pair as above, `sort_order`
  (index on `(property_id, sort_order)`).
- **The attraction image** is an `image` in the same property's library: composite FK
  `(property_id, media_asset_id)` with the hand-edited `ON DELETE SET NULL (media_asset_id)` (see
  `drizzle/0005_*`). `setAttractionImage` checks it is an image; `updateMediaAsset` refuses to turn
  an attraction image into a video.
- **NULL in CHECKs:** a CHECK passes when it evaluates to NULL, so the coordinate rule is written
  `(lat IS NULL) = (lng IS NULL) AND lat BETWEEN ... AND lng BETWEEN ...`. An `OR` of the two
  halves would let a lone latitude through.

## Microsite config and sections (UST-17)

- **Two sources of truth.** The curated presets live in **code**, in `src/lib/features/microsite/registry.ts`
  (pure data, no server imports, shared by the repo and the Phase 2 renderer): templates (key,
  name, ordered default `{ type, variant }` sections), accent presets (`light` on paper, `dark` on
  ink), font pairings, and the allowed variants per section type. They map to components and
  tokens, so adding a preset is a code change, not a migration. The **database** stores only a
  property's choices. A unit test holds every accent to WCAG AA (4.5:1) on its tone.
- **`microsite_config`** is 1:1 with `property` (`property_id` primary key, cascading FK):
  `template_key`, `accent_key`, `font_key`, all `text NOT NULL` with the registry defaults. No
  CHECK or enum, so retiring a preset needs no migration. Writes validate keys against the
  registry; reads (`getMicrositeConfig`) resolve an unknown or removed key to the default, so a
  deleted preset never breaks a live microsite.
- **`microsite_section`**: `type` is the closed `microsite_section_type` enum (hero, overview,
  gallery, rooms, amenities, host_story, location, booking_cta; a test keeps it equal to the
  registry), `variant` (text, validated against the registry for that type, default `'default'`),
  `enabled`, `sort_order`. `UNIQUE (property_id, type)`: each section at most once per property.
  No separate order index: the unique constraint's index serves the per-property lookup and a
  property has at most eight sections. No per-section settings or JSON: content comes from the
  domain tables.
- **The template changes only through `applyTemplate`**, which sets the key and replaces the
  sections (upserting, so a type the template keeps keeps its row id). `setMicrositeTheme` sets
  accent and font only and rejects `templateKey`, so the key and the sections never disagree.
- **No rows is a valid state.** `getRenderableMicrosite` falls back to the resolved template's
  default sections when a property has none. For an unknown property it returns `undefined`; the
  theme and sections are read in one repeatable-read snapshot. Section edits (`setSectionEnabled`,
  `setSectionVariant`, `setSectionOrder`) need rows to exist, so the dashboard calls
  `applyTemplate` first; it replaces the whole list with the template's defaults.
- **Writes lock the property row** (as in UST-15/16). `setSectionOrder` writes every position in
  one statement.

## Booking requests and messages (UST-18)

Booking requests only (decision 3); guests need just an email (decision 4). Code:
`db/booking.schema.ts`, `booking/booking.repo.ts`, and the pure rules in `booking/lifecycle.ts`.

- **`booking_request`** holds both kinds in one table, so the owner's inbox is one list. `kind` is
  `booking` (check-in/out dates, party, optional room, price snapshot) or `question` (a general
  enquiry: no dates, room, party or price). `reference` is a unique human code such as
  `UST-7K3P9Q` (alphabet without `0/O/1/I`, retried on collision). CHECKs: a booking has both
  dates with `check_out > check_in`, `adults >= 1` and `children >= 0`; a question has none of
  those; a question is only `pending` or `closed` and a booking is never `closed`; the guest name
  is non-blank; `guest_email` is lower case with an `@`; `currency` is `^[A-Z]{3}$`; the two price
  columns are both set or both null and `>= 0`.
- **Dates** are `date` columns (`YYYY-MM-DD` strings in Drizzle), calendar dates in the property's
  timezone. `createBookingRequest` rejects a `check_in` before today in that timezone.
- **The room** is a composite FK `(property_id, room_id)` -> `room(property_id, id)`, so it must
  belong to the same property, with the hand-edited `ON DELETE SET NULL (room_id)` (see
  `drizzle/0007_*`; `db:push` would make it a plain `SET NULL`). Deleting a room keeps the request
  and its price snapshot. With a room chosen, `adults + children` may not exceed the room's
  `max_guests`; `children` null or absent means 0. **Postgres 15 or newer is required** for the
  column-scoped `SET NULL` (also used by the media and host FKs): `compose.yaml` and CI pin
  `postgres:18` (matches existing local volumes; a major-version change needs a dump/restore or
  `docker compose down -v`). Creation takes `FOR SHARE` on the property row (so a concurrent archive waits),
  not `FOR UPDATE`.
- **The price is a snapshot** taken at creation, only for a booking with a room: the property's
  `currency`, the room's `nightly_rate_minor`, and `estimated_total_minor = rate x nights`
  (exact integer minor units, no rounding; overflow of an int4 is a typed error). A later rate
  change never rewrites it. Requests do not block dates or hold inventory: the owner decides.
- **Lifecycle** (`TRANSITIONS` in `lifecycle.ts`, enforced under `FOR UPDATE`): a booking goes
  `pending` -> `accepted | declined | cancelled | expired`, and `accepted` -> `cancelled`; a
  question goes `pending` -> `closed`. Anything else throws `BookingTransitionError`.
  `responded_at` is set on accept/decline and `cancelled_at` on cancel. Each transition appends a
  `system` message in the same transaction. Every transition function takes an optional `now`
  (before the executor) that drives the stamps and the expiry check.
- **Expiry.** `expires_at` is created + 72 hours (`REQUEST_TTL_MS`). It is enforced at
  transition time: inside the locked transition, a pending booking with `expires_at <= now` is
  flipped to `expired` (with its system message), that is committed, and `BookingExpiredError` (a
  `BookingTransitionError`) is thrown for the requested accept, decline or cancel. An accepted
  booking is no longer subject to expiry. `expireStaleRequests` sweeps overdue pending
  **bookings** (never questions) in one UPDATE; it still needs a caller (a scheduled job, Phase
  6), but correctness does not depend on it.
- **`booking_message`** is the append-only thread (no `updated_at`, no edits): `sender` is
  `guest | host | system`, `author_user_id` is null for a guest without an account, `body` is
  non-blank. Cascades with the request. `created_at` defaults to `clock_timestamp()`, not
  `now()`, so rows written in one transaction still order by insert. **The guest's opening note
  exists only as the thread's first `guest` message**; there is no `message` column on the
  request, so the inbox reads the note from the thread.
- **Guest access token.** On create the repo draws 32 random bytes with
  `crypto.getRandomValues`, stores only the SHA-256 hex (`guest_access_token_hash`, unique), and
  returns the plain base64url token **once**, for the emailed link. It is never stored or logged;
  `findBookingRequestByAccessToken` hashes the presented token and looks up the hash. Repo reads
  never return the hash column.
- **Authorisation is the route's job.** The repository does not know who is calling. Phase 6
  routes must decide who may accept/decline/close (the property owner), who may cancel (the owner,
  or the guest presenting the token), who may read a thread, and which `sender` a caller may use
  for `addMessage`. `listGuestRequests` trusts that the caller proved the email or account.
- Deleting a property cascades to its requests and messages; deleting a guest or author account
  nulls the reference and keeps the row.

## Reviews (UST-19)

Reviews make a property believable, so genuine guest reviews are never blurred with anything an
owner enters. Code: `db/review.schema.ts`, `review/review.repo.ts`, pure rounding in
`review/summary.ts`.

- **Two sources** (`review_source`). `guest` is verified: tied to a stay that happened on Ustay
  through `booking_request_id` (unique, so one review per booking; `ON DELETE SET NULL`, so the
  review outlives its booking). `imported` is entered by an owner for a property that already has
  a reputation elsewhere; it needs a non-blank `origin` ("Google", "Booking.com") and has no
  booking. **Labelling rule for Phase 2 and Phase 5 UI: an imported review must always be shown
  with its `origin` label, and never styled or counted as a verified guest review.** The summary
  returns `guestCount` and `importedCount` separately for that reason.
- **Columns.** `rating` is a `smallint`, whole stars 1 to 5. `body` and `author_name` are required
  and non-blank; `title` is optional. For a guest review `author_name` is a display name such as
  "Aisha R." (`displayName()` makes it from the booking's guest name), never the email: tokens
  containing `@` are dropped, and a blank or over-long result becomes `Guest`. `stayed_on` is a
  date: for a guest review the booking's `check_in`; for an imported one it is optional and may
  not be after today in the property's timezone. `author_user_id` copies `guest_user_id` (set
  null on account delete). `moderated_at` is when the platform published or rejected the review
  (null while `pending`); `published_at` is the same instant for a published review.
- **CHECKs.** A guest review has no `origin`; an imported review has a non-blank `origin` and no
  booking; `host_reply` and `host_replied_at` are both set or both null (and the reply is
  non-blank); `published_at` is set if and only if `status = 'published'`; `moderated_at` is set
  if and only if `status <> 'pending'`. The "a guest review has
  a booking" rule is the repo's, at creation, because the FK may later be nulled.
- **Verified-stay rule.** `createGuestReview` needs: the booking exists
  (`ReviewBookingNotFoundError`), belongs to this property (`ReviewBookingPropertyError`), is a
  `booking` that is `accepted` (`ReviewBookingNotEligibleError`), its `check_out` is on or before
  today in the property's timezone with an injected `now` (`ReviewStayNotCompleteError`), and has
  no review yet (`ReviewAlreadyExistsError`, mapped from the unique index's 23505). Proving the
  caller is that guest (the access token or the signed-in account) is the route's job.
- **Moderation.** Every review starts `pending` (the `review_status` default), imported ones too,
  so an owner cannot put a fake review live. `publishReview` / `rejectReview` are platform actions,
  allowed only from `pending` (`ReviewTransitionError`), and take an injected `now` that stamps
  `moderated_at` (and `published_at` on publish). **Owners cannot edit or delete guest reviews**: the repo has no update for
  `rating`, `title` or `body`, and `deleteImportedReview` refuses guest reviews
  (`ReviewSourceError`). An owner's tools are the host reply (`setHostReply`, which stamps
  `host_replied_at`; a blank or `null` reply clears it; a new reply needs a `published` review, else `ReviewNotPublishedError`)
  and deleting imported reviews. **Routes must enforce who calls what**: moderation is not an
  owner action, replies and imported deletes are the property owner's, and writing a guest
  review is the verified guest's.
- **Aggregate.** `getRatingSummary(propertyId)` is computed on read from **published** reviews in
  one aggregate query: `count`, `average` (rounded half-up to one decimal in integer arithmetic,
  `null` for no reviews), the 1 to 5 `distribution`, and `guestCount` / `importedCount`. Nothing
  is cached on `property`. Add a cached or materialised summary when discovery sorts by rating
  (Phase 5); at MVP scale one indexed aggregate is cheap.
- **Reads.** `listReviews(propertyId, { status = 'published', source, limit, cursor })` returns
  `{ items, nextCursor }` as a keyset page on the raw column plus `id`. Published reviews (the
  public view) are newest first: `published_at DESC NULLS LAST, id DESC`, on
  `(property_id, status, published_at desc)`. Pending and rejected reviews (the moderation queue)
  are oldest first, `created_at ASC, id ASC`, so the backlog is worked first in, first out, on
  `(property_id, status, created_at)`. The cursor carries the timestamp as Postgres read it back
  (microsecond ISO string), so paging never skips or repeats a row; a db test runs `EXPLAIN` on
  both orderings and checks the indexes are used.
- Relations: `property.reviews`, `review.property`, `review.bookingRequest`, `review.authorUser`,
  `bookingRequest.review`. Deleting a property cascades to its reviews.

## Seeding

`bun run db:seed` and `bun run db:reset` (UST-10) are the harness for local/dev data. The
sample property (UST-20) is the domain seed data; this section also covers the runner and the
conventions that data drops into.

| Command            | What it does                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `bun run db:seed`  | Runs every module in `seedModules` (`src/lib/server/db/seed/index.ts`). Idempotent.         |
| `bun run db:reset` | Drops + recreates the `public` schema, applies the migrations, then `db:seed`. Destructive. |

**Layout** — `src/lib/server/db/seed/`:

- `guard.ts` — pure, dependency-free refusal logic (`checkSeedGuard` / `checkResetGuard`), unit
  tested in `guard.test.ts` with no database. `db:seed` refuses when `NODE_ENV=production`.
  `db:reset` additionally refuses any `DATABASE_URL` whose hostname isn't one `compose.yaml` /
  `.env.example` could have produced (`localhost`, `127.0.0.1`, `::1`, `db`) — dropping a schema
  is destructive, so the bar is higher than seeding's.
- `client.ts` — a Postgres + better-auth instance built straight from `process.env`, **not** the
  real `$lib/server/db/index.ts` / `$lib/server/auth.ts`. Seed scripts run as plain `bun`
  processes (`bun run db:seed`), never through Vite, so the SvelteKit virtual modules those two
  files depend on (`$env/dynamic/private`, `$app/server`) don't exist outside a Vite build.
  `bun run` loads `.env` itself, so `process.env.DATABASE_URL` needs no extra setup. `../schema`
  has no `$env` dependency, so both the real and seed clients read the exact same table shapes.
- `index.ts` — the runner. `seedModules: SeedModule[]` is the growth point: **Phase 1 adds one
  file per aggregate here**, each exporting a `SeedModule` (`{ name, run }`) and pushed onto the
  array in the order it must run (a booking after the property it books, etc). Seed modules can't
  import repositories: they pull `$env` through `$lib/server/db`, which doesn't exist under plain
  `bun`. A module's `run` writes through `ctx.db` with the Drizzle query builder, and creates
  through better-auth for auth rows (the dev user). It is either check-then-create or an insert
  with `onConflictDoNothing` on a unique key, so a second run changes nothing and staff edits
  survive. Never raw SQL strings.
- `dev-user.ts` — seed module #1, and the template every later module copies. Creates
  `owner@ustay.test` / `ustay-dev-password` through better-auth's `signUpEmail` (never by
  hand-inserting into `user` / `account` — that's the only way the stored hash matches what
  `emailAndPassword` sign-in checks it against later). Idempotent by check-then-create: `email`
  is unique, so a `select` decides whether to call better-auth at all.
- `sample-property.ts` — the sample property **Rumah Kabus** (UST-20), the Phase 1 exit criterion:
  one published property with every relation filled, in real copy, for the Phase 2 microsite to be
  built against. Slug `rumah-kabus` (exported as `SAMPLE_PROPERTY_SLUG`), a fictional highland
  retreat in the Cameron Highlands (`MYR`, `Asia/Kuala_Lumpur`), owned by the dev user. It has the
  story, a host profile, 4 rooms (with media and amenities), property amenities with notes, a hero,
  a 7-image gallery and a thumbnail, a location with `show_exact_location = false`, the
  `cameron-highlands` destination, 8 attractions, the `editorial` microsite (all 8 sections
  enabled, gallery `zoom`, accent `forest`), 5 guest reviews (4 published, 1 pending, each backed
  by an accepted past booking, one with a host reply), 2 imported reviews (Google, Booking.com),
  and an inbox of one pending future booking and one open question with short threads. The
  published ratings average 4.7. It is idempotent (skips if the slug exists) and runs in one
  transaction. Past and future dates are computed in the property's timezone from "now", and
  access tokens are hashed random bytes whose plain values are discarded. It writes directly with
  the query builder, so it reproduces what the repos enforce (same-library media, price snapshots
  of rate x nights, consistent `published_at` / `moderated_at`, display-name authors, 72-hour
  `expires_at`, lower-cased emails). `seed.db.test.ts` reads it back through the repos.
- **Imagery** is local: `media_asset.url` is a site-relative path to one of the six photographs in
  `static/prototype/` (`/prototype/hero-forest.jpg`, ...) with their real pixel sizes, and
  `storage_key` stays null. Files are reused across placements (several `media_asset` rows may
  share one file, with their own focal point and alt text). The photographs do not depict
  Malaysia, so their alt text describes only what is in the frame. No new images and no external
  URLs, so e2e and offline dev never need the network. Phase 3 brings real owner photography.
- `reset.ts` — `runReset()`: drop/recreate `public` → `drizzle-kit push --force` → `runSeed()`.

Both entry points are guarded, `NODE_ENV`-checked, and safe to script: `bun run db:seed` /
`db:reset` exit non-zero on refusal or failure, printing the reason, before touching Postgres.

## Adding a table — checklist

1. `id()`, `...timestamps()`, and `slug()` if the entity has a public URL.
2. Explicit `onDelete` on every foreign key. Decide cascade vs restrict deliberately: a booking
   must survive a property being delisted.
3. Index every column you filter or join on that isn't already unique or a primary key.
4. `NOT NULL` by default; a nullable column should mean something ("not yet published"), and
   `.notNull()` beats a `''` sentinel.
5. Export the table and its `relations()` from `schema.ts`.
6. `bun run db:generate`, read the SQL, commit it with the schema change.
7. Tests that only assert schema shape need no database — see `helpers.test.ts`. Anything that
   needs real SQL is an integration test (`*.db.test.ts`, see "Integration tests" below) and must
   not run in the default `bun run test` gate.

## Integration tests

Real queries against Postgres run in their own lane, never in `bun run test`.

```bash
docker compose up -d     # Colima/Docker; db at localhost:5432
bun run test:db          # = vitest run --project db
```

- **Files:** `*.db.test.ts`, next to the code they test (`property.repo.db.test.ts`). The
  `client`/`server` projects exclude them; the `db` project (see `vite.config.ts`) runs only them,
  with `fileParallelism: false`. `bun run test` passes `--project` flags for the other three
  projects, so it needs no database.
- **Database:** `ustay_test` on the same server, never `local`. The URL is `TEST_DATABASE_URL`, or
  `DATABASE_URL` with the db name swapped. `src/lib/server/test/global-setup.ts` **drops and
  recreates** `ustay_test` on every run, then applies the committed `drizzle/` migrations with
  drizzle's migrator, so the migration files themselves are tested from zero. It refuses to run
  unless the database is named `ustay_test` and the host is local (a remote host is allowed only
  on GitHub Actions with `TEST_DATABASE_URL` set explicitly; plain `CI=true` is not enough)
  (`src/lib/server/test/db-url.ts`, unit-tested without a database).
- **`$env` resolution:** the `db` project aliases `$env/dynamic/private` to
  `src/lib/server/test/env.ts` (reads the worker's `process.env`, filled by the project's
  `test.env` with the test URL), so `$lib/server/db` and `$lib/server/auth` work unchanged in
  tests. Other projects, `vite dev` and `build` are untouched. A `beforeAll` asserts
  `current_database()` is `ustay_test` before anything is truncated.
- **Isolation:** every table in `public` is truncated before each test
  (`TRUNCATE … RESTART IDENTITY CASCADE`, tables discovered from `pg_tables`, so new tables are
  covered automatically; `src/lib/server/test/setup.ts`). Not a per-test rollback: repositories
  open their own transactions, and tests must see real commits and rollbacks. Tests build their
  own data; don't rely on another test's rows.
- **Helpers:** `$lib/server/test/db.ts` re-exports `db` and `truncateAll`.
- **CI:** the `db integration` job in `.github/workflows/ci.yml` runs `bun run test:db` against a
  `postgres:18` service container.
