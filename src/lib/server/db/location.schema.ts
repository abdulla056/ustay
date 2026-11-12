/**
 * Where a property is and what is around it (UST-16): `destination` (platform-curated grouping
 * for discovery), `property_location` (1:1 with a property) and `attraction` (the host's own
 * local recommendations, per property).
 *
 * Privacy: many homestays are the host's own home, so `show_exact_location` defaults to false.
 * Public pages show the locality and an approximate area unless the owner opts in.
 *
 * No PostGIS: plain `double precision` coordinates are enough for the MVP; distance search is
 * Phase 5's job. The attraction image is an image from the same property's library: composite FK
 * `(property_id, media_asset_id)` with `ON DELETE SET NULL (media_asset_id)` (hand-edited in the
 * migration; the snapshot records plain `set null`).
 *
 * Conventions: `docs/DATABASE.md`. Relations live in `./relations`.
 */
import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	doublePrecision,
	foreignKey,
	index,
	integer,
	pgEnum,
	pgTable,
	text
} from 'drizzle-orm/pg-core';
import { id, slug, timestamps, uuidRef } from './helpers';
import { mediaAsset } from './media.schema';
import { property } from './property.schema';

export const attractionCategory = pgEnum('attraction_category', [
	'restaurant',
	'cafe',
	'beach',
	'nature',
	'culture',
	'activity',
	'shopping',
	'nightlife',
	'transport',
	'other'
]);

export const travelMode = pgEnum('travel_mode', ['walk', 'cycle', 'drive', 'boat', 'transit']);

export const destination = pgTable(
	'destination',
	{
		id: id(),
		slug: slug(),
		name: text('name').notNull(),
		region: text('region'),
		countryCode: text('country_code').notNull(),
		summary: text('summary'),
		...timestamps()
	},
	(t) => [
		check('destination_name_check', sql`${t.name} ~ '\\S'`),
		check('destination_country_code_check', sql`${t.countryCode} ~ '^[A-Z]{2}$'`)
	]
);

export const propertyLocation = pgTable(
	'property_location',
	{
		propertyId: uuidRef('property_id')
			.primaryKey()
			.references(() => property.id, { onDelete: 'cascade' }),
		addressLine1: text('address_line1'),
		addressLine2: text('address_line2'),
		locality: text('locality').notNull(),
		region: text('region'),
		postalCode: text('postal_code'),
		countryCode: text('country_code').notNull(),
		latitude: doublePrecision('latitude'),
		longitude: doublePrecision('longitude'),
		destinationId: uuidRef('destination_id').references(() => destination.id, {
			onDelete: 'set null'
		}),
		/** Opt-in. When false, public pages show the locality and an approximate area only. */
		showExactLocation: boolean('show_exact_location').notNull().default(false),
		...timestamps()
	},
	(t) => [
		check('property_location_locality_check', sql`${t.locality} ~ '\\S'`),
		check('property_location_country_code_check', sql`${t.countryCode} ~ '^[A-Z]{2}$'`),
		check(
			'property_location_coordinates_check',
			sql`(${t.latitude} IS NULL) = (${t.longitude} IS NULL) AND ${t.latitude} BETWEEN -90 AND 90 AND ${t.longitude} BETWEEN -180 AND 180`
		),
		index('property_location_destination_id_idx').on(t.destinationId)
	]
);

export const attraction = pgTable(
	'attraction',
	{
		id: id(),
		propertyId: uuidRef('property_id')
			.notNull()
			.references(() => property.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		category: attractionCategory('category').notNull(),
		/** The host's voice, e.g. "Ask for Kak Ros's nasi lemak". */
		hostNote: text('host_note'),
		travelMinutes: integer('travel_minutes'),
		travelMode: travelMode('travel_mode'),
		distanceMeters: integer('distance_meters'),
		url: text('url'),
		latitude: doublePrecision('latitude'),
		longitude: doublePrecision('longitude'),
		mediaAssetId: uuidRef('media_asset_id'),
		sortOrder: integer('sort_order').notNull().default(0),
		...timestamps()
	},
	(t) => [
		// Same-property rule. The migration hand-edits the action to
		// `ON DELETE SET NULL (media_asset_id)` so deleting the image never nulls `property_id`.
		foreignKey({
			name: 'attraction_media_asset_fk',
			columns: [t.propertyId, t.mediaAssetId],
			foreignColumns: [mediaAsset.propertyId, mediaAsset.id]
		}).onDelete('set null'),
		check('attraction_name_check', sql`${t.name} ~ '\\S'`),
		check('attraction_host_note_check', sql`${t.hostNote} ~ '\\S'`),
		check('attraction_travel_minutes_check', sql`${t.travelMinutes} > 0`),
		check('attraction_distance_meters_check', sql`${t.distanceMeters} > 0`),
		check(
			'attraction_travel_pair_check',
			sql`(${t.travelMinutes} IS NULL) = (${t.travelMode} IS NULL)`
		),
		check('attraction_url_check', sql`${t.url} ~ '^https?://'`),
		check(
			'attraction_coordinates_check',
			sql`(${t.latitude} IS NULL) = (${t.longitude} IS NULL) AND ${t.latitude} BETWEEN -90 AND 90 AND ${t.longitude} BETWEEN -180 AND 180`
		),
		check('attraction_sort_order_check', sql`${t.sortOrder} >= 0`),
		index('attraction_property_id_sort_order_idx').on(t.propertyId, t.sortOrder)
	]
);
