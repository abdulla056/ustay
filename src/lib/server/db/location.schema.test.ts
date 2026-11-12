import { describe, expect, it } from 'vitest';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';
import {
	attraction,
	attractionCategory,
	destination,
	propertyLocation,
	travelMode
} from './location.schema';

const names = (cols: { name: string }[]) => cols.map((c) => c.name);
const renderChecks = (table: Parameters<typeof getTableConfig>[0]) =>
	Object.fromEntries(
		getTableConfig(table).checks.map((c) => [c.name, new PgDialect().sqlToQuery(c.value).sql])
	);

describe('destination table shape', () => {
	const columns = getTableColumns(destination);
	it('is platform-curated with a unique slug and a country code check', () => {
		expect(getTableName(destination)).toBe('destination');
		expect(Object.values(columns).map((c) => c.name)).toEqual([
			'id',
			'slug',
			'name',
			'region',
			'country_code',
			'summary',
			'created_at',
			'updated_at'
		]);
		expect(columns.slug.isUnique).toBe(true);
		expect(columns.name.notNull).toBe(true);
		expect(columns.countryCode.notNull).toBe(true);
		expect(renderChecks(destination)['destination_country_code_check']).toContain('^[A-Z]{2}$');
	});
});

describe('property_location table shape', () => {
	const columns = getTableColumns(propertyLocation);
	const config = getTableConfig(propertyLocation);

	it('is 1:1 with property and keeps the exact location private by default', () => {
		expect(getTableName(propertyLocation)).toBe('property_location');
		expect(columns.propertyId.primary).toBe(true);
		expect(columns.showExactLocation.notNull).toBe(true);
		expect(columns.showExactLocation.default).toBe(false);
		const cascade = config.foreignKeys.find((f) => f.onDelete === 'cascade');
		expect(names(cascade!.reference().columns)).toEqual(['property_id']);
	});

	it('requires locality and country, everything else is optional', () => {
		expect(columns.locality.notNull).toBe(true);
		expect(columns.countryCode.notNull).toBe(true);
		for (const key of [
			'addressLine1',
			'addressLine2',
			'region',
			'postalCode',
			'latitude',
			'longitude',
			'destinationId'
		] as const) {
			expect(columns[key].notNull, key).toBe(false);
		}
	});

	it('nulls the destination when it is deleted, and indexes it', () => {
		const fk = config.foreignKeys.find(
			(f) => getTableName(f.reference().foreignTable) === 'destination'
		);
		expect(fk?.onDelete).toBe('set null');
		expect(config.indexes.map((i) => i.config.name)).toContain(
			'property_location_destination_id_idx'
		);
	});

	it('checks the coordinate pair, ranges and country code', () => {
		const checks = renderChecks(propertyLocation);
		expect(checks['property_location_coordinates_check']).toContain('-90 AND 90');
		expect(checks['property_location_coordinates_check']).toContain('-180 AND 180');
		expect(checks['property_location_country_code_check']).toContain('^[A-Z]{2}$');
	});
});

describe('attraction table shape', () => {
	const columns = getTableColumns(attraction);
	const config = getTableConfig(attraction);

	it('has the agreed enums', () => {
		expect(attractionCategory.enumValues).toEqual([
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
		expect(travelMode.enumValues).toEqual(['walk', 'cycle', 'drive', 'boat', 'transit']);
	});

	it('requires name, category and property; the host note and travel are optional', () => {
		expect(getTableName(attraction)).toBe('attraction');
		for (const key of ['propertyId', 'name', 'category', 'sortOrder'] as const) {
			expect(columns[key].notNull, key).toBe(true);
		}
		for (const key of [
			'hostNote',
			'travelMinutes',
			'travelMode',
			'distanceMeters',
			'url',
			'mediaAssetId'
		] as const) {
			expect(columns[key].notNull, key).toBe(false);
		}
	});

	it('ties the image to the same property with a composite set-null foreign key', () => {
		const fk = config.foreignKeys.find((f) => f.getName() === 'attraction_media_asset_fk');
		const ref = fk!.reference();
		expect(names(ref.columns)).toEqual(['property_id', 'media_asset_id']);
		expect(names(ref.foreignColumns)).toEqual(['property_id', 'id']);
		expect(fk!.onDelete).toBe('set null');
	});

	it('checks travel pair, url, coordinates and positivity; indexes the order', () => {
		const checks = renderChecks(attraction);
		expect(checks['attraction_travel_pair_check']).toContain('IS NULL) = (');
		expect(checks['attraction_url_check']).toContain('^https?://');
		expect(checks['attraction_coordinates_check']).toContain('-90 AND 90');
		expect(checks['attraction_travel_minutes_check']).toContain('> 0');
		expect(checks['attraction_distance_meters_check']).toContain('> 0');
		expect(config.indexes.map((i) => i.config.name)).toContain(
			'attraction_property_id_sort_order_idx'
		);
	});
});
