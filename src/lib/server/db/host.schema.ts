/**
 * The host behind a property (UST-15): `host_profile`, 1:1 with `property`. `property_id` is both
 * the primary key and the foreign key, so a property has at most one host presentation. (The
 * owner account is `property.owner_id` -> `user`; a cross-property host identity is not modelled.)
 *
 * The avatar is an image from the same property's media library: `(property_id, avatar_asset_id)`
 * references `media_asset(property_id, id)` with `ON DELETE SET NULL (avatar_asset_id)`
 * (hand-edited in the migration; Drizzle cannot express the column list, and the snapshot
 * records plain `set null`). "The avatar is an image" spans two rows, so it lives in the repo.
 * `bio` is raw markdown; rendering and sanitising belong to the page layer (Phase 2).
 *
 * Conventions: `docs/DATABASE.md`. Relations live in `./relations`.
 */
import { sql } from 'drizzle-orm';
import { check, foreignKey, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { timestamps, uuidRef } from './helpers';
import { mediaAsset } from './media.schema';
import { property } from './property.schema';

export const hostProfile = pgTable(
	'host_profile',
	{
		propertyId: uuidRef('property_id')
			.primaryKey()
			.references(() => property.id, { onDelete: 'cascade' }),
		displayName: text('display_name').notNull(),
		bio: text('bio'),
		avatarAssetId: uuidRef('avatar_asset_id'),
		/** Calendar year the host started hosting. The "not in the future" bound is the repo's. */
		hostingSince: integer('hosting_since'),
		languages: text('languages')
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),
		...timestamps()
	},
	(t) => [
		// Same-property rule. The migration hand-edits the action to
		// `ON DELETE SET NULL (avatar_asset_id)` (Postgres 15+) so deleting the avatar never nulls
		// `property_id`, which is the primary key.
		foreignKey({
			name: 'host_profile_avatar_fk',
			columns: [t.propertyId, t.avatarAssetId],
			foreignColumns: [mediaAsset.propertyId, mediaAsset.id]
		}).onDelete('set null'),
		check('host_profile_display_name_check', sql`${t.displayName} ~ '\\S'`),
		check('host_profile_bio_check', sql`${t.bio} ~ '\\S'`),
		check('host_profile_hosting_since_check', sql`${t.hostingSince} >= 1900`)
	]
);
