import { describe, expect, it } from 'vitest';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';
import { property, propertySlugRedirect, propertyStatus, propertyType } from './property.schema';

const columns = getTableColumns(property);
const config = getTableConfig(property);
const redirectConfig = getTableConfig(propertySlugRedirect);

describe('property table shape', () => {
	it('uses singular snake_case names and the agreed column order', () => {
		expect(getTableName(property)).toBe('property');
		expect(Object.values(columns).map((column) => column.name)).toEqual([
			'id',
			'slug',
			'name',
			'type',
			'status',
			'tagline',
			'short_description',
			'description',
			'story_heading',
			'story_body',
			'currency',
			'timezone',
			'owner_id',
			'published_at',
			'created_at',
			'updated_at'
		]);
	});

	it('has the agreed enum values', () => {
		expect(propertyType.enumValues).toEqual(['homestay', 'resort', 'boutique', 'rental']);
		expect(propertyStatus.enumValues).toEqual(['draft', 'published', 'archived']);
	});

	it('defaults status to draft', () => {
		expect(columns.status.hasDefault).toBe(true);
		expect(columns.status.default).toBe('draft');
		expect(columns.status.notNull).toBe(true);
	});

	it('keeps the owner nullable until Phase 3', () => {
		expect(columns.ownerId.notNull).toBe(false);
	});

	it('requires currency and timezone', () => {
		expect(columns.currency.notNull).toBe(true);
		expect(columns.timezone.notNull).toBe(true);
	});

	it('has a checked, unique slug', () => {
		expect(columns.slug.notNull).toBe(true);
		expect(columns.slug.isUnique).toBe(true);
	});

	it('enforces a three-letter uppercase ISO-4217 currency via a check constraint', () => {
		const check = config.checks.find((c) => c.name === 'property_currency_check');
		expect(check).toBeDefined();
		const rendered = new PgDialect().sqlToQuery(check!.value).sql;
		expect(rendered).toBe(`"property"."currency" ~ '^[A-Z]{3}$'`);
	});

	it('has the owner and status indexes', () => {
		const indexNames = config.indexes.map((index) => index.config.name);
		expect(indexNames).toContain('property_owner_id_idx');
		expect(indexNames).toContain('property_status_idx');
		const ownerIndex = config.indexes.find((i) => i.config.name === 'property_owner_id_idx');
		expect(ownerIndex?.config.columns.map((c) => (c as { name: string }).name)).toEqual([
			'owner_id'
		]);
	});

	it('clears the owner when the user is deleted', () => {
		const [foreignKey] = config.foreignKeys;
		expect(foreignKey).toBeDefined();
		expect(foreignKey.onDelete).toBe('set null');
	});
});

describe('property_slug_redirect table shape', () => {
	const redirectColumns = getTableColumns(propertySlugRedirect);

	it('has the agreed names and columns', () => {
		expect(getTableName(propertySlugRedirect)).toBe('property_slug_redirect');
		expect(Object.values(redirectColumns).map((column) => column.name)).toEqual([
			'id',
			'old_slug',
			'property_id',
			'created_at',
			'updated_at'
		]);
	});

	it('makes old_slug unique and not null', () => {
		expect(redirectColumns.oldSlug.isUnique).toBe(true);
		expect(redirectColumns.oldSlug.notNull).toBe(true);
	});

	it('has the property_id index', () => {
		const indexNames = redirectConfig.indexes.map((index) => index.config.name);
		expect(indexNames).toContain('property_slug_redirect_property_id_idx');
	});

	it('cascades on property delete', () => {
		const [foreignKey] = redirectConfig.foreignKeys;
		expect(foreignKey).toBeDefined();
		expect(foreignKey.onDelete).toBe('cascade');
		expect(getTableName(foreignKey.reference().foreignTable)).toBe('property');
	});
});
