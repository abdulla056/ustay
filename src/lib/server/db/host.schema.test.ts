import { describe, expect, it } from 'vitest';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';
import { hostProfile } from './host.schema';

const columns = getTableColumns(hostProfile);
const config = getTableConfig(hostProfile);
const names = (cols: { name: string }[]) => cols.map((c) => c.name);

describe('host_profile table shape', () => {
	it('uses singular snake_case names and the agreed column order', () => {
		expect(getTableName(hostProfile)).toBe('host_profile');
		expect(Object.values(columns).map((c) => c.name)).toEqual([
			'property_id',
			'display_name',
			'bio',
			'avatar_asset_id',
			'hosting_since',
			'languages',
			'created_at',
			'updated_at'
		]);
	});

	it('is 1:1 with property: property_id is the primary key', () => {
		expect(columns.propertyId.primary).toBe(true);
		const fk = config.foreignKeys.find((f) => f.reference().columns.length === 1);
		expect(fk?.onDelete).toBe('cascade');
	});

	it('requires a display name, languages default to empty, the rest is optional', () => {
		expect(columns.displayName.notNull).toBe(true);
		expect(columns.languages.notNull).toBe(true);
		expect(columns.languages.hasDefault).toBe(true);
		for (const key of ['bio', 'avatarAssetId', 'hostingSince'] as const) {
			expect(columns[key].notNull, key).toBe(false);
		}
	});

	it('ties the avatar to the same property with a composite set-null foreign key', () => {
		const fk = config.foreignKeys.find((f) => f.getName() === 'host_profile_avatar_fk');
		expect(fk).toBeDefined();
		const ref = fk!.reference();
		expect(names(ref.columns)).toEqual(['property_id', 'avatar_asset_id']);
		expect(names(ref.foreignColumns)).toEqual(['property_id', 'id']);
		expect(getTableName(ref.foreignTable)).toBe('media_asset');
		expect(fk!.onDelete).toBe('set null');
	});

	it('checks name, bio and the hosting_since floor', () => {
		const rendered = Object.fromEntries(
			config.checks.map((c) => [c.name, new PgDialect().sqlToQuery(c.value).sql])
		);
		expect(rendered['host_profile_display_name_check']).toContain("~ '\\S'");
		expect(rendered['host_profile_bio_check']).toContain("~ '\\S'");
		expect(rendered['host_profile_hosting_since_check']).toContain('>= 1900');
	});
});
