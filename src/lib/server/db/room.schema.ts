/**
 * The room type (UST-12): a bookable type that belongs to a property, e.g. "Garden Suite", with
 * `unit_count` identical units. Currency is not stored here: it lives on the property (decision
 * #2), so `nightly_rate_minor` is minor units in the property's currency.
 *
 * Conventions: `docs/DATABASE.md`. Relations live in `./relations`.
 */
import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { id, timestamps, uuidRef } from './helpers';
import { property } from './property.schema';

export const bedTypes = ['single', 'double', 'queen', 'king', 'bunk', 'sofa'] as const;

export type RoomBed = { type: (typeof bedTypes)[number]; count: number };

export const room = pgTable(
	'room',
	{
		id: id(),
		propertyId: uuidRef('property_id')
			.notNull()
			.references(() => property.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		maxGuests: integer('max_guests').notNull(),
		beds: jsonb('beds')
			.$type<RoomBed[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		/** Minor units in the property's currency. */
		nightlyRateMinor: integer('nightly_rate_minor').notNull(),
		unitCount: integer('unit_count').notNull().default(1),
		sortOrder: integer('sort_order').notNull().default(0),
		...timestamps()
	},
	(t) => [
		check('room_max_guests_check', sql`${t.maxGuests} > 0`),
		check('room_nightly_rate_minor_check', sql`${t.nightlyRateMinor} >= 0`),
		check('room_unit_count_check', sql`${t.unitCount} >= 1`),
		index('room_property_id_sort_order_idx').on(t.propertyId, t.sortOrder)
	]
);

/**
 * Check an untrusted bed configuration (e.g. from a form) before it is written to `beds`.
 * Throws unless the value is an array of `{ type, count }` with `type` in {@link bedTypes},
 * `count` an integer >= 1, and no `type` listed twice. Returns the validated beds.
 */
export function validateBeds(beds: unknown): RoomBed[] {
	if (!Array.isArray(beds)) throw new Error('beds must be an array');
	const seen = new Set<string>();
	return beds.map((bed, i) => {
		if (typeof bed !== 'object' || bed === null) throw new Error(`beds[${i}] must be an object`);
		const { type, count } = bed as Record<string, unknown>;
		if (typeof type !== 'string' || !(bedTypes as readonly string[]).includes(type)) {
			throw new Error(`beds[${i}].type must be one of ${bedTypes.join(', ')}`);
		}
		if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) {
			throw new Error(`beds[${i}].count must be an integer >= 1`);
		}
		if (seen.has(type)) throw new Error(`beds lists type "${type}" more than once`);
		seen.add(type);
		return { type: type as RoomBed['type'], count };
	});
}
