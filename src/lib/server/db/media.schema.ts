/**
 * Media (UST-14): a per-property library of images and video (`media_asset`), plus two explicit
 * placement tables that put library assets on the property (`property_media`: hero, gallery,
 * thumbnail) and on rooms (`room_media`).
 *
 * Storage is external URLs for the MVP. `storage_key` is reserved for R2-hosted assets later, so
 * an uploaded asset is the same row with one more column filled in.
 *
 * **Same-property rule.** A placement may only use an asset from its own property's library. The
 * repository checks this (`media.repo.ts`), and the database enforces it too with composite
 * foreign keys: `media_asset` and `room` each expose a `(property_id, id)` unique key, and the
 * placement tables reference those pairs, so a mismatched property cannot be written by any path.
 * The poster of a video is the one exception: a composite FK cannot `SET NULL` just one of its
 * columns from Drizzle, so poster same-property is enforced in the repository only.
 *
 * Conventions: `docs/DATABASE.md`. Relations live in `./relations`.
 */
import { sql } from 'drizzle-orm';
import {
	check,
	foreignKey,
	index,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	real,
	text,
	unique,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { id, timestamps, uuidRef } from './helpers';
import { property } from './property.schema';
import { room } from './room.schema';

export const mediaKind = pgEnum('media_kind', ['image', 'video']);

/** Where an asset sits on a property page. At most one `hero` per property (partial unique). */
export const mediaRole = pgEnum('media_role', ['hero', 'gallery', 'thumbnail']);

export const mediaAsset = pgTable(
	'media_asset',
	{
		id: id(),
		propertyId: uuidRef('property_id')
			.notNull()
			.references(() => property.id, { onDelete: 'cascade' }),
		kind: mediaKind('kind').notNull(),
		/** Public `http(s)` URL of the file. External for the MVP. */
		url: text('url').notNull(),
		/** R2 object key once uploads exist (Phase 3/6). Null for external assets. */
		storageKey: text('storage_key').unique(),
		/** Intrinsic pixel size, so the UI can reserve the aspect ratio and avoid layout shift. */
		width: integer('width').notNull(),
		height: integer('height').notNull(),
		/** Required and non-blank: every image needs a text alternative. */
		altText: text('alt_text').notNull(),
		caption: text('caption'),
		credit: text('credit'),
		/** Art-directed crop centre, 0–1 from the left / top. Both set or both null. */
		focalX: real('focal_x'),
		focalY: real('focal_y'),
		/** Video only. */
		durationSeconds: real('duration_seconds'),
		/** Video only: an image asset from the same library, shown before playback. */
		posterAssetId: uuidRef('poster_asset_id'),
		...timestamps()
	},
	(t) => [
		// The target of the placement tables' composite foreign keys.
		unique('media_asset_property_id_id_unique').on(t.propertyId, t.id),
		foreignKey({
			name: 'media_asset_poster_asset_id_fk',
			columns: [t.posterAssetId],
			foreignColumns: [t.id]
		}).onDelete('set null'),
		check('media_asset_url_check', sql`${t.url} ~ '^https?://'`),
		check('media_asset_width_check', sql`${t.width} > 0`),
		check('media_asset_height_check', sql`${t.height} > 0`),
		check('media_asset_alt_text_check', sql`${t.altText} ~ '\\S'`),
		check(
			'media_asset_focal_check',
			sql`(${t.focalX} IS NULL) = (${t.focalY} IS NULL) AND ${t.focalX} BETWEEN 0 AND 1 AND ${t.focalY} BETWEEN 0 AND 1`
		),
		check('media_asset_duration_seconds_check', sql`${t.durationSeconds} > 0`),
		check(
			'media_asset_video_fields_check',
			sql`${t.kind} = 'video' OR (${t.durationSeconds} IS NULL AND ${t.posterAssetId} IS NULL)`
		),
		check('media_asset_poster_not_self_check', sql`${t.posterAssetId} <> ${t.id}`),
		index('media_asset_property_id_created_at_idx').on(t.propertyId, t.createdAt),
		index('media_asset_poster_asset_id_idx').on(t.posterAssetId)
	]
);

// Placement: an asset in a role on its property, at a position. An asset holds each role at most
// once (the primary key), but may hold several roles (hero and also in the gallery).
export const propertyMedia = pgTable(
	'property_media',
	{
		propertyId: uuidRef('property_id')
			.notNull()
			.references(() => property.id, { onDelete: 'cascade' }),
		mediaAssetId: uuidRef('media_asset_id').notNull(),
		role: mediaRole('role').notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		...timestamps()
	},
	(t) => [
		primaryKey({ columns: [t.mediaAssetId, t.role] }),
		// Same-property rule: the asset must be in this property's library.
		foreignKey({
			name: 'property_media_media_asset_fk',
			columns: [t.propertyId, t.mediaAssetId],
			foreignColumns: [mediaAsset.propertyId, mediaAsset.id]
		}).onDelete('cascade'),
		check('property_media_sort_order_check', sql`${t.sortOrder} >= 0`),
		uniqueIndex('property_media_property_id_role_sort_order_idx').on(
			t.propertyId,
			t.role,
			t.sortOrder
		),
		uniqueIndex('property_media_property_id_hero_idx')
			.on(t.propertyId)
			.where(sql`${t.role} = 'hero'`)
	]
);

// Placement: an asset on a room, at a position. `property_id` is the room's property, carried so
// the composite foreign keys can tie room and asset to the same property.
export const roomMedia = pgTable(
	'room_media',
	{
		roomId: uuidRef('room_id').notNull(),
		propertyId: uuidRef('property_id').notNull(),
		mediaAssetId: uuidRef('media_asset_id').notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		...timestamps()
	},
	(t) => [
		primaryKey({ columns: [t.roomId, t.mediaAssetId] }),
		foreignKey({
			name: 'room_media_room_fk',
			columns: [t.roomId, t.propertyId],
			foreignColumns: [room.id, room.propertyId]
		}).onDelete('cascade'),
		foreignKey({
			name: 'room_media_media_asset_fk',
			columns: [t.propertyId, t.mediaAssetId],
			foreignColumns: [mediaAsset.propertyId, mediaAsset.id]
		}).onDelete('cascade'),
		check('room_media_sort_order_check', sql`${t.sortOrder} >= 0`),
		uniqueIndex('room_media_room_id_sort_order_idx').on(t.roomId, t.sortOrder),
		index('room_media_property_id_media_asset_id_idx').on(t.propertyId, t.mediaAssetId)
	]
);
