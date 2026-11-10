# Worker Brief — UST-11: Property model (core entity)

Linear: https://linear.app/abdulla-safar/issue/UST-11/model-property-core-entity

## Mission

Add the first domain table, `property`, plus its slug-redirect table and repository. Everything
in Phase 1 hangs off it. The orchestrator has decided every column below. Implement it exactly;
do not add, rename or drop columns.

## Read first (in the repo)

- `docs/DATABASE.md` (all of it, especially Naming, Slugs and the "Adding a table" checklist).
- `docs/DECISIONS.md`, decisions 1 (slug redirects) and 2 (currency).
- `docs/ARCHITECTURE.md` → "Data access / repository layer" (naming `find/get/list/insert/update`,
  executor-last signatures).
- `src/lib/server/db/helpers.ts`, `helpers.test.ts` (schema-shape test pattern), `slug.ts`,
  `schema.ts`, `index.ts`.

## Scope (do): exact spec

### 1. Enums (in a new `src/lib/server/db/property.schema.ts`)

- `propertyType = pgEnum('property_type', ['homestay', 'resort', 'boutique', 'rental'])`
- `propertyStatus = pgEnum('property_status', ['draft', 'published', 'archived'])`

### 2. Table `property` (same file)

| TS key             | SQL column              | Definition                                                           |
| ------------------ | ----------------------- | -------------------------------------------------------------------- |
| `id`               | `id`                    | `id()`                                                               |
| `slug`             | `slug`                  | `slug()`                                                             |
| `name`             | `name`                  | `text().notNull()`                                                   |
| `type`             | `type`                  | `propertyType('type').notNull()`                                     |
| `status`           | `status`                | `propertyStatus('status').notNull().default('draft')`                |
| `tagline`          | `tagline`               | `text()` nullable                                                    |
| `shortDescription` | `short_description`     | `text()` nullable                                                    |
| `description`      | `description`           | `text()` nullable (long-form)                                        |
| `currency`         | `currency`              | `text().notNull()`, ISO-4217 code                                    |
| `timezone`         | `timezone`              | `text().notNull()`, IANA name, e.g. `Asia/Kuala_Lumpur`              |
| `ownerId`          | `owner_id`              | `userRef('owner_id', 'set null')`, nullable (owners come in Phase 3) |
| `publishedAt`      | `published_at`          | `timestamp(..., { withTimezone: true })` nullable                    |
| …                  | `created_at/updated_at` | `...timestamps()`                                                    |

Table extras (third arg of `pgTable`):

- `check('property_currency_check', sql\`${t.currency} ~ '^[A-Z]{3}$'\`)`
- `index('property_owner_id_idx').on(t.ownerId)`, `index('property_status_idx').on(t.status)`

### 3. Table `property_slug_redirect` (same file), per decision 1

| TS key       | SQL column    | Definition                                                                                |
| ------------ | ------------- | ----------------------------------------------------------------------------------------- |
| `id`         | `id`          | `id()`                                                                                    |
| `oldSlug`    | `old_slug`    | `text().notNull().unique()`                                                               |
| `propertyId` | `property_id` | `uuidRef('property_id').notNull().references(() => property.id, { onDelete: 'cascade' })` |
| …            |               | `...timestamps()`                                                                         |

Index: `index('property_slug_redirect_property_id_idx').on(t.propertyId)`.

### 4. Relations

`propertyRelations`: `owner: one(user, { fields: [property.ownerId], references: [user.id] })`,
`slugRedirects: many(propertySlugRedirect)`. `propertySlugRedirectRelations`: `property: one(...)`.
Leave a comment saying that child entities (rooms, photos, amenities) add their `many()` here.

### 5. Wire up

- `schema.ts`: `export * from './property.schema';`
- `src/lib/server/db/index.ts`: add
  `export type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];`
- Run `bun run db:generate` and commit the generated `drizzle/` SQL plus its meta files. This is the
  repo's first migration, so it also contains the auth tables. That is expected; say so in the PR.
  Read the SQL and check that the enum, check constraint and indexes are present.

### 6. Repository `src/lib/server/property/property.repo.ts`

Plain async functions. The executor is the last param, `tx: Executor = db`. No `error()`/`redirect()`.

- `findPropertyBySlug(slug)` → row or `undefined`.
- `findPropertyById(id)` → row or `undefined`.
- `findRedirectedSlug(oldSlug)` → the property's **current** slug (`string`) or `undefined`
  (join redirect → property).
- `insertProperty(input: NewPropertyInput)` → the inserted row. `NewPropertyInput` is
  `Omit<typeof property.$inferInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'> & { slug?: string }`.
  If there's no slug, generate it with `uniqueSlug(input.name, isTaken)`, where `isTaken` checks both
  `property.slug` and `property_slug_redirect.old_slug`, so retired slugs are never reused.
- `renameProperty(id, newName, opts?: { newSlug?: string })` → the updated row. It runs **in a
  transaction**: compute the new slug (given, or `uniqueSlug` with the same `isTaken`). If it differs
  from the current one, insert `{ oldSlug: current, propertyId: id }` into the redirect table, then
  update `name` + `slug`. If a redirect row already has `oldSlug === newSlug` and belongs to this
  property (renaming back), delete that row first.
- `publishProperty(id)` → sets `status='published'` and `publishedAt=new Date()`, returns the row.

### 7. Docs

- `docs/DATABASE.md` → Slugs section: replace the open "if a rename needs old links…" sentence
  with the decision: renames write a `<table>_slug_redirect` row, and routes 301 (route work is
  UST-21). Under Naming → Money, add: "Currency is per property (`property.currency`); see
  `docs/DECISIONS.md` for money rules."

### 8. Tests (no database, default gate only)

`src/lib/server/db/property.schema.test.ts`, copying the `helpers.test.ts` pattern:

- Table names, SQL column names in order, and enum values.
- `status` defaults to `draft`; `owner_id` is nullable; `currency` and `timezone` are notNull.
- Use `getTableConfig` to assert that the check constraint and both indexes exist, and that the
  redirect FK uses `onDelete: 'cascade'`.

The repository needs Postgres, so it gets **no** tests in this PR (UST-41 adds the integration lane).
Note this in the PR.

## Out of scope (don't)

- No routes, UI, seed data (UST-20), rooms/photos/amenities tables, or `$lib/types` Money type.
- Don't touch `.env.example`, `README.md`, or `src/lib/components/` (another worker owns those
  files this wave).

## Acceptance

- Schema + migration + repo + docs + schema tests exactly as specified.
- `bun run check`, `bun run lint`, `bun run test` green; CI green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-11-property-model`.
Commit trailer: `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`. Linear UST-11 goes In
Progress → Done (tick its checklist). Push, open a PR to `main`, don't merge. Poll `gh pr checks <n>`
until CI finishes; don't wait for a notification.

## Report back to orchestrator

PR link, CI result, the migration file name(s), and anything you couldn't do as specified and why.
