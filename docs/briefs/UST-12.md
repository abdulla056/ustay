# Worker Brief — UST-12: Room model

Linear: https://linear.app/abdulla-safar/issue/UST-12/model-room-and-room-types

## Mission

Add the `room` table. A room is a bookable room **type** that belongs to a property, e.g.
"Garden Suite", with `unit_count` identical units. The orchestrator has decided every column below.
Implement it exactly.

## Read first (in the repo)

- `docs/DATABASE.md`, `docs/DECISIONS.md` (decision 2: currency lives on the **property**, so a
  room has no currency column).
- `src/lib/server/db/property.schema.ts`, `property.schema.test.ts`, `index.ts` (`Executor`),
  `src/lib/server/property/property.repo.ts`. Copy its style exactly.

## Scope (do): exact spec

### 1. Move relations out (avoids a circular import)

Create `src/lib/server/db/relations.ts`. **Move** `propertyRelations` and
`propertySlugRedirectRelations` there from `property.schema.ts`, unchanged, and add the room
relations below. `schema.ts` re-exports `./relations`. Keep the property schema tests passing.

### 2. Table `room` in new `src/lib/server/db/room.schema.ts`

| TS key             | SQL column           | Definition                                                                                |
| ------------------ | -------------------- | ----------------------------------------------------------------------------------------- |
| `id`               | `id`                 | `id()`                                                                                    |
| `propertyId`       | `property_id`        | `uuidRef('property_id').notNull().references(() => property.id, { onDelete: 'cascade' })` |
| `name`             | `name`               | `text().notNull()`                                                                        |
| `description`      | `description`        | `text()` nullable                                                                         |
| `maxGuests`        | `max_guests`         | `integer().notNull()`                                                                     |
| `beds`             | `beds`               | `jsonb().$type<RoomBed[]>().notNull().default(sql\`'[]'::jsonb\`)`                        |
| `nightlyRateMinor` | `nightly_rate_minor` | `integer().notNull()`, minor units in the property's currency                             |
| `unitCount`        | `unit_count`         | `integer().notNull().default(1)`                                                          |
| `sortOrder`        | `sort_order`         | `integer().notNull().default(0)`                                                          |
| …                  |                      | `...timestamps()`                                                                         |

Export in the same file:
`export const bedTypes = ['single', 'double', 'queen', 'king', 'bunk', 'sofa'] as const;`
`export type RoomBed = { type: (typeof bedTypes)[number]; count: number };`

Table extras:

- `check('room_max_guests_check', sql\`${t.maxGuests} > 0\`)`
- `check('room_nightly_rate_minor_check', sql\`${t.nightlyRateMinor} >= 0\`)`
- `check('room_unit_count_check', sql\`${t.unitCount} >= 1\`)`
- `index('room_property_id_sort_order_idx').on(t.propertyId, t.sortOrder)`

### 3. Relations (in `relations.ts`)

- `roomRelations`: `property: one(property, { fields: [room.propertyId], references: [property.id] })`.
  Add the comment `// photos: many(roomPhoto) — added by the media issue`.
- `propertyRelations` gains `rooms: many(room)`.

### 4. Wire up + migration

`schema.ts` exports `./room.schema`. Run `bun run db:generate`, which should produce
`drizzle/0001_*.sql`. Read the SQL: it must add only the `room` table, its checks and its index.

### 5. Repository `src/lib/server/property/room.repo.ts`

The executor is the last param, `tx: Executor = db`, as in `property.repo.ts`.

- `listRoomsForProperty(propertyId)` → rows ordered by `sortOrder` asc, then `createdAt` asc.
- `findRoomById(id)` → row or `undefined`.
- `insertRoom(input: NewRoomInput)`, where `NewRoomInput` is
  `Omit<typeof room.$inferInsert, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'> & { sortOrder?: number }`.
  If `sortOrder` is missing, use (current max for that property) + 1, or 0 if the property has no rooms.
- `updateRoom(id, patch: Partial<Omit<NewRoomInput, 'propertyId'>>)` → updated row or `undefined`.
- `deleteRoom(id)` → deleted row or `undefined`.
- `reorderRooms(propertyId, orderedIds: string[])` opens its own `db.transaction`. It sets
  `sortOrder = index` for each id, and the `where` includes `propertyId` so ids from another property
  can't be reordered. It throws `Error` if any id didn't update.

### 6. Pure validation helper + tests (no DB)

- In `room.schema.ts`, export `validateBeds(beds: unknown): RoomBed[]`. It throws `Error` unless the
  value is an array of `{ type ∈ bedTypes, count: integer ≥ 1 }` with no duplicate `type`.
- `src/lib/server/db/room.schema.test.ts`: column names in order, defaults (`unit_count` 1,
  `sort_order` 0), nullability, all three checks and the index via `getTableConfig`, cascade FK, and
  `validateBeds` accept/reject cases.

## Out of scope (don't)

- No currency column on room. No photo/media tables, availability, seed data, routes or UI.
- Don't touch `src/routes/`, `src/lib/components/`, `src/lib/index.ts`, `src/lib/server/auth*` (another
  worker owns those files this wave).

## Acceptance

- Exactly as specified; migration `0001` adds only `room`.
- `bun run check`, `bun run lint`, `bun run test` green; CI green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-12-room-model`.
Commit trailer: `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`. Linear UST-12 goes In
Progress → Done (tick its checklist; note "media relation deferred to the media issue"). Push, open
a PR to `main`, don't merge. Poll `gh pr checks <n>` until CI finishes.

## Report back to orchestrator

PR link, CI result, migration file name, deviations with reasons.
