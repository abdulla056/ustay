# Worker Brief — UST-13: Amenities model

Linear: https://linear.app/abdulla-safar/issue/UST-13/model-amenities-property-relations

## Mission

Add an amenity catalogue (a lookup table, since staff will extend it) plus join tables linking
amenities to properties and rooms, and seed a standard set. The orchestrator has decided every
column below. Implement it exactly.

## Read first (in the repo)

- `docs/DATABASE.md` (Naming → Enums: "use a lookup table for anything editable by staff").
- `src/lib/server/db/property.schema.ts`, `room.schema.ts`, `relations.ts`, `schema.ts`,
  `room.schema.test.ts`, `src/lib/server/property/room.repo.ts`. Copy their style.
- `src/lib/server/db/seed/index.ts` + `dev-user.ts` (the seed-module pattern).

## Scope (do): exact spec

### 1. New `src/lib/server/db/amenity.schema.ts`

`amenityCategory = pgEnum('amenity_category', ['essentials', 'bathroom', 'kitchen', 'outdoor', 'wellness', 'family', 'accessibility', 'services'])`

Table `amenity`:

| TS key      | SQL column   | Definition                                                     |
| ----------- | ------------ | -------------------------------------------------------------- |
| `id`        | `id`         | `id()`                                                         |
| `key`       | `key`        | `text().notNull().unique()`, a stable machine key, e.g. `wifi` |
| `name`      | `name`       | `text().notNull()`, display name, e.g. "Wi-Fi"                 |
| `category`  | `category`   | `amenityCategory('category').notNull()`                        |
| `icon`      | `icon`       | `text().notNull()`, an icon key that UST-27 maps to an SVG     |
| `sortOrder` | `sort_order` | `integer().notNull().default(0)`                               |
| …           |              | `...timestamps()`                                              |

Check: `check('amenity_key_check', sql\`${t.key} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'\`)`.
Index: `index('amenity_category_sort_order_idx').on(t.category, t.sortOrder)`.

Table `property_amenity` (a join table, so it gets a **composite primary key** and no `id()`; add a
comment saying so):

| TS key       | SQL column    | Definition                                                                                |
| ------------ | ------------- | ----------------------------------------------------------------------------------------- |
| `propertyId` | `property_id` | `uuidRef('property_id').notNull().references(() => property.id, { onDelete: 'cascade' })` |
| `amenityId`  | `amenity_id`  | `uuidRef('amenity_id').notNull().references(() => amenity.id, { onDelete: 'restrict' })`  |
| `note`       | `note`        | `text()` nullable, e.g. "heated, May–Sep"                                                 |
| …            |               | `...timestamps()`                                                                         |

`primaryKey({ columns: [t.propertyId, t.amenityId] })`, `index('property_amenity_amenity_id_idx').on(t.amenityId)`.

Table `room_amenity`: the same shape with `roomId` / `room_id` (→ `room.id`, cascade) instead of
property. PK `(roomId, amenityId)`, index `room_amenity_amenity_id_idx`.

### 2. Relations (in `relations.ts`)

- `amenityRelations`: `properties: many(propertyAmenity)`, `rooms: many(roomAmenity)`.
- `propertyAmenityRelations` / `roomAmenityRelations`: `one()` each side.
- Add `amenities: many(propertyAmenity)` to `propertyRelations` and `amenities: many(roomAmenity)`
  to `roomRelations`.

### 3. Wire up + migration

`schema.ts` exports `./amenity.schema`. Run `bun run db:generate`, which should produce
`drizzle/0002_*.sql` with only the enum + three tables. **Postgres is available now**: run
`docker compose up -d` (or `colima start` first if Docker isn't running), then `bun run db:reset`.
It must succeed and print the amenity seed line.

### 4. Repository `src/lib/server/property/amenity.repo.ts`

The executor is the last param, `tx: Executor = db`.

- `listAmenities()`, ordered by `category`, `sortOrder`, `name`.
- `listPropertyAmenities(propertyId)` → amenity rows plus `note`, in the same order (join).
- `setPropertyAmenities(propertyId, items: { amenityId: string; note?: string | null }[])` opens its
  own `db.transaction`, deletes the property's rows, then inserts `items` (skipping the insert if
  empty). It replaces the whole set.
- `listRoomAmenities(roomId)` and `setRoomAmenities(roomId, amenityIds: string[])`: the same
  pattern, with no note.

### 5. Seed module `src/lib/server/db/seed/amenities.ts`

Seed scripts run under plain `bun`, so **don't import repositories** (they pull `$env` via
`$lib/server/db`). Write with `ctx.db` and the Drizzle query builder, importing tables from
`../amenity.schema`.

- Export `STANDARD_AMENITIES` (an array of `{ key, name, category, icon, sortOrder }`) with these 24,
  where icon = key:
  - essentials: wifi "Wi-Fi", air-conditioning "Air conditioning", workspace "Dedicated workspace", parking "Free parking"
  - bathroom: hot-water "Hot water", toiletries "Toiletries", bathtub "Bathtub"
  - kitchen: kitchen "Full kitchen", coffee-maker "Coffee maker", breakfast "Breakfast included"
  - outdoor: pool "Pool", garden "Garden", bbq "BBQ grill", balcony "Balcony"
  - wellness: spa "Spa", gym "Gym", yoga-deck "Yoga deck"
  - family: crib "Crib", high-chair "High chair"
  - accessibility: step-free-access "Step-free access", lift "Lift"
  - services: airport-transfer "Airport transfer", daily-housekeeping "Daily housekeeping", concierge "Concierge"

  `sortOrder` is the item's index within its category.

- `seedAmenities(db)` does `insert(amenity).values(STANDARD_AMENITIES).onConflictDoUpdate({ target: amenity.key, set: { name, category, icon, sortOrder } })`
  (use `sql\`excluded.<col>\``). It returns `{ created: true, detail: '24 amenities upserted' }`(match`SeedModuleResult`). Push `{ name: 'amenities', run: (ctx) => seedAmenities(ctx.db) }`onto`seedModules`after`dev-user`.

### 6. Tests (default gate, no DB)

`src/lib/server/db/amenity.schema.test.ts`:

- Column names for all three tables.
- Composite PKs (via `getTableConfig(...).primaryKeys`).
- FK `onDelete` values: cascade for property and room, restrict for amenity.
- The key check and the indexes.
- `STANDARD_AMENITIES`: 24 items, unique keys, every key matches the key regex, every category valid.

## Out of scope (don't)

- No UI, no icon SVGs, no routes, no CI changes, no `vite.config.ts`/`package.json` changes (another
  worker owns those this wave). Don't touch `src/routes/`.

## Acceptance

- Exactly as specified. `bun run db:reset` succeeds locally, and running `db:seed` again succeeds
  without changing anything.
- `bun run check`, `bun run lint`, `bun run test` green; CI green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-13-amenities`. Commit
trailer: `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`. Linear UST-13 goes In
Progress → Done (tick its checklist). Push, open a PR to `main`, don't merge. Poll
`gh pr checks <n>` until CI finishes.

**Migration clash rule:** before opening the PR, `git fetch && git rebase origin/main`. If main
gained a new migration, delete yours (`drizzle/0002_*` + its snapshot), revert the `_journal.json`
entry, and re-run `bun run db:generate`.

## Report back to orchestrator

PR link, CI result, migration file name, `db:reset` output (seed lines), deviations with reasons.
