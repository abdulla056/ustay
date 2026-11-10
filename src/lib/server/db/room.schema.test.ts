import { describe, expect, it } from 'vitest';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';
import { bedTypes, room, validateBeds } from './room.schema';

const columns = getTableColumns(room);
const config = getTableConfig(room);

describe('room table shape', () => {
	it('uses singular snake_case names and the agreed column order', () => {
		expect(getTableName(room)).toBe('room');
		expect(Object.values(columns).map((column) => column.name)).toEqual([
			'id',
			'property_id',
			'name',
			'description',
			'max_guests',
			'beds',
			'nightly_rate_minor',
			'unit_count',
			'sort_order',
			'created_at',
			'updated_at'
		]);
	});

	it('has no currency column (currency lives on the property)', () => {
		expect(Object.values(columns).map((column) => column.name)).not.toContain('currency');
	});

	it('requires the core fields and leaves only description nullable', () => {
		expect(columns.propertyId.notNull).toBe(true);
		expect(columns.name.notNull).toBe(true);
		expect(columns.maxGuests.notNull).toBe(true);
		expect(columns.beds.notNull).toBe(true);
		expect(columns.nightlyRateMinor.notNull).toBe(true);
		expect(columns.unitCount.notNull).toBe(true);
		expect(columns.sortOrder.notNull).toBe(true);
		expect(columns.description.notNull).toBe(false);
	});

	it('defaults unit_count to 1, sort_order to 0 and beds to an empty array', () => {
		expect(columns.unitCount.hasDefault).toBe(true);
		expect(columns.unitCount.default).toBe(1);
		expect(columns.sortOrder.hasDefault).toBe(true);
		expect(columns.sortOrder.default).toBe(0);
		expect(columns.beds.hasDefault).toBe(true);
		const rendered = new PgDialect().sqlToQuery(columns.beds.default as never).sql;
		expect(rendered).toBe(`'[]'::jsonb`);
	});

	it('has the three value checks', () => {
		const rendered = Object.fromEntries(
			config.checks.map((c) => [c.name, new PgDialect().sqlToQuery(c.value).sql])
		);
		expect(rendered).toEqual({
			room_max_guests_check: `"room"."max_guests" > 0`,
			room_nightly_rate_minor_check: `"room"."nightly_rate_minor" >= 0`,
			room_unit_count_check: `"room"."unit_count" >= 1`
		});
	});

	it('has the property_id + sort_order index', () => {
		const roomIndex = config.indexes.find(
			(i) => i.config.name === 'room_property_id_sort_order_idx'
		);
		expect(roomIndex).toBeDefined();
		expect(roomIndex?.config.columns.map((c) => (c as { name: string }).name)).toEqual([
			'property_id',
			'sort_order'
		]);
	});

	it('cascades on property delete', () => {
		const [foreignKey] = config.foreignKeys;
		expect(foreignKey).toBeDefined();
		expect(foreignKey.onDelete).toBe('cascade');
		expect(getTableName(foreignKey.reference().foreignTable)).toBe('property');
	});
});

describe('bed types', () => {
	it('has the agreed bed types', () => {
		expect(bedTypes).toEqual(['single', 'double', 'queen', 'king', 'bunk', 'sofa']);
	});
});

describe('validateBeds', () => {
	it('accepts an empty list and valid bed lines', () => {
		expect(validateBeds([])).toEqual([]);
		expect(
			validateBeds([
				{ type: 'queen', count: 1 },
				{ type: 'sofa', count: 2 }
			])
		).toEqual([
			{ type: 'queen', count: 1 },
			{ type: 'sofa', count: 2 }
		]);
	});

	it('rejects a non-array', () => {
		expect(() => validateBeds(null)).toThrow(Error);
		expect(() => validateBeds({ type: 'queen', count: 1 })).toThrow(Error);
	});

	it('rejects an element that is not an object', () => {
		expect(() => validateBeds(['queen'])).toThrow(Error);
		expect(() => validateBeds([null])).toThrow(Error);
	});

	it('rejects an unknown bed type', () => {
		expect(() => validateBeds([{ type: 'hammock', count: 1 }])).toThrow(Error);
	});

	it('rejects a count that is zero, negative, fractional or not a number', () => {
		expect(() => validateBeds([{ type: 'king', count: 0 }])).toThrow(Error);
		expect(() => validateBeds([{ type: 'king', count: -1 }])).toThrow(Error);
		expect(() => validateBeds([{ type: 'king', count: 1.5 }])).toThrow(Error);
		expect(() => validateBeds([{ type: 'king', count: '2' }])).toThrow(Error);
	});

	it('rejects a duplicate type', () => {
		expect(() =>
			validateBeds([
				{ type: 'double', count: 1 },
				{ type: 'double', count: 2 }
			])
		).toThrow(Error);
	});
});
