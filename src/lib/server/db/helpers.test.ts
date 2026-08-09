import { describe, expect, it } from 'vitest';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { deletedAt, id, slug, timestamps, userRef, uuidRef } from './helpers';

/**
 * Reference table — the canonical shape every Phase-1 domain table should copy. It is
 * deliberately NOT exported from `schema.ts`, so it never reaches a migration; the assertions
 * below are what keep the conventions honest.
 */
const exampleStay = pgTable('example_stay', {
	id: id(),
	slug: slug(),
	name: text('name').notNull(),
	hostId: userRef('host_id').notNull(),
	regionId: uuidRef('region_id'),
	nightlyRateMinor: integer('nightly_rate_minor').notNull(),
	deletedAt: deletedAt(),
	...timestamps()
});

const columns = getTableColumns(exampleStay);

describe('table naming', () => {
	it('uses a singular snake_case table name and snake_case columns', () => {
		expect(getTableName(exampleStay)).toBe('example_stay');
		expect(Object.values(columns).map((column) => column.name)).toEqual([
			'id',
			'slug',
			'name',
			'host_id',
			'region_id',
			'nightly_rate_minor',
			'deleted_at',
			'created_at',
			'updated_at'
		]);
	});
});

describe('id()', () => {
	it('is a database-defaulted uuid primary key', () => {
		expect(columns.id.columnType).toBe('PgUUID');
		expect(columns.id.primary).toBe(true);
		expect(columns.id.notNull).toBe(true);
		expect(columns.id.hasDefault).toBe(true);
	});
});

describe('uuidRef()', () => {
	it('is a nullable uuid until the caller chains notNull()', () => {
		expect(columns.regionId.columnType).toBe('PgUUID');
		expect(columns.regionId.primary).toBe(false);
		expect(columns.regionId.notNull).toBe(false);
	});
});

describe('timestamps()', () => {
	it('gives both columns a timezone-aware default', () => {
		for (const column of [columns.createdAt, columns.updatedAt]) {
			expect(column.columnType).toBe('PgTimestamp');
			expect(column.notNull).toBe(true);
			expect(column.hasDefault).toBe(true);
			expect(column.getSQLType()).toBe('timestamp with time zone');
		}
	});

	it('refreshes updatedAt (and only updatedAt) on write', () => {
		expect(typeof columns.updatedAt.onUpdateFn).toBe('function');
		expect(columns.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
		expect(columns.createdAt.onUpdateFn).toBeUndefined();
	});

	it('returns fresh builders per call, so two tables never share column state', () => {
		const first = timestamps();
		const second = timestamps();
		expect(first.createdAt).not.toBe(second.createdAt);
		expect(first.updatedAt).not.toBe(second.updatedAt);
	});
});

describe('deletedAt()', () => {
	it('is an opt-in nullable timestamptz', () => {
		expect(columns.deletedAt.notNull).toBe(false);
		expect(columns.deletedAt.getSQLType()).toBe('timestamp with time zone');
	});
});

describe('slug()', () => {
	it('is a required, unique text column so lookups hit an index', () => {
		expect(columns.slug.columnType).toBe('PgText');
		expect(columns.slug.notNull).toBe(true);
		expect(columns.slug.isUnique).toBe(true);
	});
});

describe('userRef()', () => {
	it('matches better-auth ids (text, not uuid) and cascades on user deletion', () => {
		expect(columns.hostId.columnType).toBe('PgText');
		expect(columns.hostId.notNull).toBe(true);

		const { foreignKeys } = getTableConfig(exampleStay);
		expect(foreignKeys).toHaveLength(1);

		const [foreignKey] = foreignKeys;
		const { columns: local, foreignTable, foreignColumns } = foreignKey.reference();
		expect(local.map((column) => column.name)).toEqual(['host_id']);
		expect(getTableName(foreignTable)).toBe('user');
		expect(foreignColumns.map((column) => column.name)).toEqual(['id']);
		expect(foreignKey.onDelete).toBe('cascade');
	});
});
