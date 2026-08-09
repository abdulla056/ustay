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
  `currency`. Never `float`, and never read `numeric` into a JS number.
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
- Slugs are unique **per table**, and are never reused after a rename. If a rename needs old links
  to keep working, add a redirect table; do not make slug lookups clever.
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
   needs real SQL is an integration test and must not run in the default `bun run test` gate.
