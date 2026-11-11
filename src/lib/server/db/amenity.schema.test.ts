import { describe, expect, it } from 'vitest';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';
import { amenity, amenityCategory, propertyAmenity, roomAmenity } from './amenity.schema';
import { STANDARD_AMENITIES } from './seed/amenities';

const dialect = new PgDialect();

const columnNames = (table: Parameters<typeof getTableColumns>[0]) =>
	Object.values(getTableColumns(table)).map((column) => column.name);

describe('amenity table shape', () => {
	it('uses singular snake_case names and the agreed column order', () => {
		expect(getTableName(amenity)).toBe('amenity');
		expect(columnNames(amenity)).toEqual([
			'id',
			'key',
			'name',
			'category',
			'icon',
			'sort_order',
			'created_at',
			'updated_at'
		]);
	});

	it('has the agreed category enum', () => {
		expect(amenityCategory.enumValues).toEqual([
			'essentials',
			'bathroom',
			'kitchen',
			'outdoor',
			'wellness',
			'family',
			'accessibility',
			'services'
		]);
	});

	it('has a unique key, defaults sort_order to 0, and has the key check and category index', () => {
		const columns = getTableColumns(amenity);
		expect(columns.key.isUnique).toBe(true);
		expect(columns.sortOrder.default).toBe(0);

		const config = getTableConfig(amenity);
		const rendered = Object.fromEntries(
			config.checks.map((c) => [c.name, dialect.sqlToQuery(c.value).sql])
		);
		expect(rendered).toEqual({
			amenity_key_check: `"amenity"."key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`
		});

		const categoryIndex = config.indexes.find(
			(i) => i.config.name === 'amenity_category_sort_order_idx'
		);
		expect(categoryIndex).toBeDefined();
		expect(categoryIndex?.config.columns.map((c) => (c as { name: string }).name)).toEqual([
			'category',
			'sort_order'
		]);
	});
});

describe('property_amenity table shape', () => {
	it('uses the agreed columns and has no id column', () => {
		expect(getTableName(propertyAmenity)).toBe('property_amenity');
		expect(columnNames(propertyAmenity)).toEqual([
			'property_id',
			'amenity_id',
			'note',
			'created_at',
			'updated_at'
		]);
	});

	it('has a composite primary key over (property_id, amenity_id)', () => {
		const config = getTableConfig(propertyAmenity);
		expect(config.primaryKeys).toHaveLength(1);
		expect(config.primaryKeys[0].columns.map((c) => c.name)).toEqual(['property_id', 'amenity_id']);
	});

	it('cascades on property delete and restricts on amenity delete', () => {
		const config = getTableConfig(propertyAmenity);
		const byTable = Object.fromEntries(
			config.foreignKeys.map((fk) => [getTableName(fk.reference().foreignTable), fk.onDelete])
		);
		expect(byTable).toEqual({ property: 'cascade', amenity: 'restrict' });
	});

	it('has the amenity_id index', () => {
		const config = getTableConfig(propertyAmenity);
		const index = config.indexes.find((i) => i.config.name === 'property_amenity_amenity_id_idx');
		expect(index).toBeDefined();
		expect(index?.config.columns.map((c) => (c as { name: string }).name)).toEqual(['amenity_id']);
	});
});

describe('room_amenity table shape', () => {
	it('uses the agreed columns and has no id column', () => {
		expect(getTableName(roomAmenity)).toBe('room_amenity');
		expect(columnNames(roomAmenity)).toEqual([
			'room_id',
			'amenity_id',
			'note',
			'created_at',
			'updated_at'
		]);
	});

	it('has a composite primary key over (room_id, amenity_id)', () => {
		const config = getTableConfig(roomAmenity);
		expect(config.primaryKeys).toHaveLength(1);
		expect(config.primaryKeys[0].columns.map((c) => c.name)).toEqual(['room_id', 'amenity_id']);
	});

	it('cascades on room delete and restricts on amenity delete', () => {
		const config = getTableConfig(roomAmenity);
		const byTable = Object.fromEntries(
			config.foreignKeys.map((fk) => [getTableName(fk.reference().foreignTable), fk.onDelete])
		);
		expect(byTable).toEqual({ room: 'cascade', amenity: 'restrict' });
	});

	it('has the amenity_id index', () => {
		const config = getTableConfig(roomAmenity);
		const index = config.indexes.find((i) => i.config.name === 'room_amenity_amenity_id_idx');
		expect(index).toBeDefined();
		expect(index?.config.columns.map((c) => (c as { name: string }).name)).toEqual(['amenity_id']);
	});
});

describe('STANDARD_AMENITIES', () => {
	it('has 24 items with unique keys', () => {
		expect(STANDARD_AMENITIES).toHaveLength(24);
		const keys = STANDARD_AMENITIES.map((a) => a.key);
		expect(new Set(keys).size).toBe(24);
	});

	it('uses keys that match the key regex and icon equal to key', () => {
		const keyPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
		for (const item of STANDARD_AMENITIES) {
			expect(item.key).toMatch(keyPattern);
			expect(item.icon).toBe(item.key);
		}
	});

	it('uses only valid categories', () => {
		const valid = new Set<string>(amenityCategory.enumValues);
		for (const item of STANDARD_AMENITIES) {
			expect(valid.has(item.category)).toBe(true);
		}
	});

	it('numbers sortOrder by index within each category', () => {
		const seen = new Map<string, number>();
		for (const item of STANDARD_AMENITIES) {
			const next = seen.get(item.category) ?? 0;
			expect(item.sortOrder).toBe(next);
			seen.set(item.category, next + 1);
		}
	});
});
