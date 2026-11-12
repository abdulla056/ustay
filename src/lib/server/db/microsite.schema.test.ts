import { describe, expect, it } from 'vitest';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';
import { SECTION_TYPES } from '../../microsite/registry';
import { micrositeConfig, micrositeSection, micrositeSectionType } from './microsite.schema';

const names = (cols: { name: string }[]) => cols.map((c) => c.name);

describe('microsite_config table shape', () => {
	const columns = getTableColumns(micrositeConfig);
	const config = getTableConfig(micrositeConfig);

	it('is 1:1 with property, keyed by property_id with a cascading FK', () => {
		expect(getTableName(micrositeConfig)).toBe('microsite_config');
		expect(columns.propertyId.primary).toBe(true);
		const cascade = config.foreignKeys.find((f) => f.onDelete === 'cascade');
		expect(names(cascade!.reference().columns)).toEqual(['property_id']);
	});

	it('stores keys as required text defaulting to the registry defaults', () => {
		expect(columns.templateKey.default).toBe('editorial');
		expect(columns.accentKey.default).toBe('forest');
		expect(columns.fontKey.default).toBe('editorial');
		for (const key of ['templateKey', 'accentKey', 'fontKey'] as const) {
			expect(columns[key].notNull, key).toBe(true);
			expect(columns[key].dataType, key).toBe('string');
		}
	});
});

describe('microsite_section table shape', () => {
	const columns = getTableColumns(micrositeSection);
	const config = getTableConfig(micrositeSection);

	it('uses an enum for the closed set of section types, equal to the registry', () => {
		expect(micrositeSectionType.enumName).toBe('microsite_section_type');
		expect(micrositeSectionType.enumValues).toEqual([...SECTION_TYPES]);
	});

	it('has the agreed columns and defaults', () => {
		expect(getTableName(micrositeSection)).toBe('microsite_section');
		expect(Object.values(columns).map((c) => c.name)).toEqual([
			'id',
			'property_id',
			'type',
			'variant',
			'enabled',
			'sort_order',
			'created_at',
			'updated_at'
		]);
		expect(columns.variant.default).toBe('default');
		expect(columns.enabled.default).toBe(true);
		for (const key of ['propertyId', 'type', 'variant', 'enabled', 'sortOrder'] as const) {
			expect(columns[key].notNull, key).toBe(true);
		}
	});

	it('is unique per (property, type), indexed by order, and cascades with the property', () => {
		const unique = config.uniqueConstraints.find(
			(u) => u.name === 'microsite_section_property_id_type_unique'
		);
		expect(names(unique!.columns)).toEqual(['property_id', 'type']);
		const index = config.indexes.find(
			(i) => i.config.name === 'microsite_section_property_id_sort_order_idx'
		);
		expect(index).toBeDefined();
		expect(config.foreignKeys.find((f) => f.onDelete === 'cascade')).toBeDefined();
	});

	it('checks sort_order is not negative', () => {
		const check = config.checks.find((c) => c.name === 'microsite_section_sort_order_check');
		expect(new PgDialect().sqlToQuery(check!.value).sql).toContain('>= 0');
	});
});
