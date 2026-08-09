/**
 * Shared column helpers for Ustay's application schema.
 *
 * Every app table is built from these so ids, timestamps and slugs behave identically
 * everywhere. The reasoning behind each choice lives in `docs/DATABASE.md` — read that before
 * adding a new convention here.
 *
 * Helpers are **functions**, not shared objects: each call returns a fresh column builder, so
 * two tables can never share builder state.
 *
 * ```ts
 * export const property = pgTable('property', {
 * 	id: id(),
 * 	slug: slug(),
 * 	name: text('name').notNull(),
 * 	hostId: userRef('host_id').notNull(),
 * 	...timestamps()
 * });
 * ```
 */
import { text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

/** Referential action applied when the referenced row is deleted. */
export type ReferentialAction = 'cascade' | 'restrict' | 'set null' | 'set default' | 'no action';

/**
 * Primary key for every app table: a database-generated UUID v4 (`gen_random_uuid()`).
 *
 * UUIDs are safe to expose in URLs and API payloads, don't leak row counts or creation order,
 * and can be minted client-side or across services without a round trip. The cost — 16 bytes
 * instead of 4 and no natural ordering — is irrelevant at Ustay's scale. Use `createdAt` (not
 * the id) whenever you need chronological ordering.
 */
export function id() {
	return uuid('id').primaryKey().defaultRandom();
}

/**
 * A non-primary UUID column, e.g. a foreign key to another app table:
 *
 * ```ts
 * propertyId: uuidRef('property_id').notNull().references(() => property.id, { onDelete: 'cascade' })
 * ```
 */
export function uuidRef(name: string) {
	return uuid(name);
}

/**
 * `createdAt` / `updatedAt`, spread into every table: `...timestamps()`.
 *
 * Both are `timestamptz` — Postgres stores an absolute instant and Drizzle hands back a JS
 * `Date`, so no column ever carries an ambiguous local time. Guest-facing wall-clock values
 * (check-in dates, a property's local calendar) are a different kind of data and must NOT use
 * these: model them as `date` / `time` plus the property's IANA timezone.
 *
 * `updatedAt` is maintained by Drizzle's `$onUpdate` (application-side), so writes that bypass
 * the ORM won't touch it. That matches the auth tables, which better-auth generates the same way.
 */
export function timestamps() {
	return {
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date())
	};
}

/**
 * Soft-delete marker. Only for tables where a row must survive deletion for audit or
 * booking-history reasons; prefer a hard delete otherwise. Every query on such a table has to
 * filter `isNull(deletedAt)`, so opt in deliberately.
 */
export function deletedAt() {
	return timestamp('deleted_at', { withTimezone: true });
}

/**
 * The URL slug of a publicly addressable entity (properties, destinations, journal entries).
 *
 * Unique and indexed by the unique constraint, so `where eq(table.slug, params.slug)` is an
 * index lookup. Generate the value with `slugify()` / `uniqueSlug()` from `./slug` — never
 * hand-write one.
 */
export function slug(name = 'slug') {
	return text(name).notNull().unique();
}

/**
 * A foreign key to the better-auth `user` table.
 *
 * Auth ids are `text` (better-auth mints them, not Postgres), so a user reference can never use
 * `uuidRef()`. Chain `.notNull()` when the row cannot exist without its user:
 *
 * ```ts
 * hostId: userRef('host_id').notNull()
 * ```
 */
export function userRef(name = 'user_id', onDelete: ReferentialAction = 'cascade') {
	return text(name).references(() => user.id, { onDelete });
}
