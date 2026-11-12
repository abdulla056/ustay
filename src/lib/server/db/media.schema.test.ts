import { describe, expect, it } from 'vitest';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig, PgDialect, type PgTable } from 'drizzle-orm/pg-core';
import { mediaAsset, mediaKind, mediaRole, propertyMedia, roomMedia } from './media.schema';
import { room } from './room.schema';

const dialect = new PgDialect();

const columnNames = (table: PgTable) =>
	Object.values(getTableColumns(table)).map((column) => column.name);

const names = (columns: { name: string }[]) => columns.map((c) => c.name);

/** Each foreign key as `local cols -> table(cols) on delete`. */
const foreignKeys = (table: PgTable) =>
	getTableConfig(table)
		.foreignKeys.map((fk) => {
			const ref = fk.reference();
			return `${names(ref.columns).join(',')} -> ${getTableName(ref.foreignTable)}(${names(ref.foreignColumns).join(',')}) ${fk.onDelete}`;
		})
		.sort();

const checks = (table: PgTable) =>
	Object.fromEntries(
		getTableConfig(table).checks.map((c) => [c.name, dialect.sqlToQuery(c.value).sql])
	);

const findIndex = (table: PgTable, name: string) =>
	getTableConfig(table).indexes.find((i) => i.config.name === name)?.config;

describe('media enums', () => {
	it('has the agreed kinds and roles', () => {
		expect(mediaKind.enumValues).toEqual(['image', 'video']);
		expect(mediaRole.enumValues).toEqual(['hero', 'gallery', 'thumbnail']);
	});
});

describe('media_asset table shape', () => {
	const columns = getTableColumns(mediaAsset);

	it('uses singular snake_case names and the agreed column order', () => {
		expect(getTableName(mediaAsset)).toBe('media_asset');
		expect(columnNames(mediaAsset)).toEqual([
			'id',
			'property_id',
			'kind',
			'url',
			'storage_key',
			'width',
			'height',
			'alt_text',
			'caption',
			'credit',
			'focal_x',
			'focal_y',
			'duration_seconds',
			'poster_asset_id',
			'created_at',
			'updated_at'
		]);
	});

	it('requires property, kind, url, dimensions and alt text; the rest is optional', () => {
		for (const key of ['propertyId', 'kind', 'url', 'width', 'height', 'altText'] as const) {
			expect(columns[key].notNull, key).toBe(true);
		}
		for (const key of [
			'storageKey',
			'caption',
			'credit',
			'focalX',
			'focalY',
			'durationSeconds',
			'posterAssetId'
		] as const) {
			expect(columns[key].notNull, key).toBe(false);
		}
		expect(columns.storageKey.isUnique).toBe(true);
	});

	it('cascades from the property and sets a deleted poster to null', () => {
		expect(foreignKeys(mediaAsset)).toEqual([
			'property_id -> property(id) cascade',
			'property_id,poster_asset_id -> media_asset(property_id,id) set null'
		]);
	});

	it('exposes (property_id, id) as a unique key for the composite foreign keys', () => {
		const keys = getTableConfig(mediaAsset).uniqueConstraints.map((u) => ({
			name: u.name,
			columns: names(u.columns)
		}));
		expect(keys).toContainEqual({
			name: 'media_asset_property_id_id_unique',
			columns: ['property_id', 'id']
		});
	});

	it('has the url, dimension, alt-text, focal and video checks', () => {
		expect(checks(mediaAsset)).toEqual({
			media_asset_url_check: `"media_asset"."url" ~ '^https?://'`,
			media_asset_width_check: `"media_asset"."width" > 0`,
			media_asset_height_check: `"media_asset"."height" > 0`,
			media_asset_alt_text_check: `"media_asset"."alt_text" ~ '\\S'`,
			media_asset_focal_check: `("media_asset"."focal_x" IS NULL) = ("media_asset"."focal_y" IS NULL) AND "media_asset"."focal_x" BETWEEN 0 AND 1 AND "media_asset"."focal_y" BETWEEN 0 AND 1`,
			media_asset_duration_seconds_check: `"media_asset"."duration_seconds" > 0`,
			media_asset_video_fields_check: `"media_asset"."kind" = 'video' OR ("media_asset"."duration_seconds" IS NULL AND "media_asset"."poster_asset_id" IS NULL)`,
			media_asset_poster_not_self_check: `"media_asset"."poster_asset_id" <> "media_asset"."id"`
		});
	});

	it('indexes the library listing and the poster reference', () => {
		expect(
			names(findIndex(mediaAsset, 'media_asset_property_id_created_at_idx')!.columns as never)
		).toEqual(['property_id', 'created_at']);
		expect(
			names(findIndex(mediaAsset, 'media_asset_poster_asset_id_idx')!.columns as never)
		).toEqual(['poster_asset_id']);
	});
});

describe('property_media table shape', () => {
	it('uses the agreed columns and has no id column', () => {
		expect(getTableName(propertyMedia)).toBe('property_media');
		expect(columnNames(propertyMedia)).toEqual([
			'property_id',
			'media_asset_id',
			'role',
			'sort_order',
			'created_at',
			'updated_at'
		]);
	});

	it('has a primary key over (media_asset_id, role)', () => {
		const [pk] = getTableConfig(propertyMedia).primaryKeys;
		expect(names(pk.columns)).toEqual(['media_asset_id', 'role']);
	});

	it('ties the asset to the same property with a composite foreign key', () => {
		expect(foreignKeys(propertyMedia)).toEqual([
			'property_id -> property(id) cascade',
			'property_id,media_asset_id -> media_asset(property_id,id) cascade'
		]);
	});

	it('has a unique position per role and at most one hero per property', () => {
		const order = findIndex(propertyMedia, 'property_media_property_id_role_sort_order_idx')!;
		expect(order.unique).toBe(true);
		expect(names(order.columns as never)).toEqual(['property_id', 'role', 'sort_order']);

		const hero = findIndex(propertyMedia, 'property_media_property_id_hero_idx')!;
		expect(hero.unique).toBe(true);
		expect(names(hero.columns as never)).toEqual(['property_id']);
		expect(dialect.sqlToQuery(hero.where!).sql).toBe(`"property_media"."role" = 'hero'`);
	});
});

describe('room_media table shape', () => {
	it('uses the agreed columns and has no id column', () => {
		expect(getTableName(roomMedia)).toBe('room_media');
		expect(columnNames(roomMedia)).toEqual([
			'room_id',
			'property_id',
			'media_asset_id',
			'sort_order',
			'created_at',
			'updated_at'
		]);
	});

	it('has a primary key over (room_id, media_asset_id)', () => {
		const [pk] = getTableConfig(roomMedia).primaryKeys;
		expect(names(pk.columns)).toEqual(['room_id', 'media_asset_id']);
	});

	it('ties room and asset to the same property with composite foreign keys', () => {
		expect(foreignKeys(roomMedia)).toEqual([
			'property_id,media_asset_id -> media_asset(property_id,id) cascade',
			'room_id,property_id -> room(id,property_id) cascade'
		]);
		const keys = getTableConfig(room).uniqueConstraints.map((u) => names(u.columns));
		expect(keys).toContainEqual(['id', 'property_id']);
	});

	it('has a unique position per room', () => {
		const order = findIndex(roomMedia, 'room_media_room_id_sort_order_idx')!;
		expect(order.unique).toBe(true);
		expect(names(order.columns as never)).toEqual(['room_id', 'sort_order']);
	});
});
