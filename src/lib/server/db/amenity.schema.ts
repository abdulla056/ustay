/**
 * Amenities (UST-13): a staff-editable catalogue (`amenity`, a lookup table so staff can extend it
 * without a migration), plus two join tables linking amenities to properties and rooms.
 *
 * Conventions: `docs/DATABASE.md`. Relations live in `./relations`.
 */
import { sql } from 'drizzle-orm';
import { check, index, integer, pgEnum, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { id, timestamps, uuidRef } from './helpers';
import { property } from './property.schema';
import { room } from './room.schema';

export const amenityCategory = pgEnum('amenity_category', [
	'essentials',
	'bathroom',
	'kitchen',
	'outdoor',
	'wellness',
	'family',
	'accessibility',
	'services'
]);

export const amenity = pgTable(
	'amenity',
	{
		id: id(),
		/** Stable machine key, e.g. `wifi`. Lowercase words joined by hyphens. */
		key: text('key').notNull().unique(),
		/** Display name, e.g. "Wi-Fi". */
		name: text('name').notNull(),
		category: amenityCategory('category').notNull(),
		/** Icon key that UST-27 maps to an SVG. */
		icon: text('icon').notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		...timestamps()
	},
	(t) => [
		check('amenity_key_check', sql`${t.key} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
		index('amenity_category_sort_order_idx').on(t.category, t.sortOrder)
	]
);

// Join table: a composite primary key over (property_id, amenity_id), so there is no `id()` column.
export const propertyAmenity = pgTable(
	'property_amenity',
	{
		propertyId: uuidRef('property_id')
			.notNull()
			.references(() => property.id, { onDelete: 'cascade' }),
		amenityId: uuidRef('amenity_id')
			.notNull()
			.references(() => amenity.id, { onDelete: 'restrict' }),
		/** Free-text qualifier, e.g. "heated, May–Sep". */
		note: text('note'),
		...timestamps()
	},
	(t) => [
		primaryKey({ columns: [t.propertyId, t.amenityId] }),
		index('property_amenity_amenity_id_idx').on(t.amenityId)
	]
);

// Join table: a composite primary key over (room_id, amenity_id), so there is no `id()` column.
export const roomAmenity = pgTable(
	'room_amenity',
	{
		roomId: uuidRef('room_id')
			.notNull()
			.references(() => room.id, { onDelete: 'cascade' }),
		amenityId: uuidRef('amenity_id')
			.notNull()
			.references(() => amenity.id, { onDelete: 'restrict' }),
		note: text('note'),
		...timestamps()
	},
	(t) => [
		primaryKey({ columns: [t.roomId, t.amenityId] }),
		index('room_amenity_amenity_id_idx').on(t.amenityId)
	]
);
