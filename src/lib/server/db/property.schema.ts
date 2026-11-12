/**
 * The property aggregate (UST-11): the core entity every Phase-1 table hangs off.
 *
 * Conventions: `docs/DATABASE.md`. Slugs are stored and renames write a redirect row to
 * `property_slug_redirect` (`docs/DECISIONS.md` #1). Currency is per property (decision #2).
 */
import { sql } from 'drizzle-orm';
import { check, index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { id, slug, timestamps, userRef, uuidRef } from './helpers';

export const propertyType = pgEnum('property_type', ['homestay', 'resort', 'boutique', 'rental']);

export const propertyStatus = pgEnum('property_status', ['draft', 'published', 'archived']);

export const property = pgTable(
	'property',
	{
		id: id(),
		slug: slug(),
		name: text('name').notNull(),
		type: propertyType('type').notNull(),
		status: propertyStatus('status').notNull().default('draft'),
		tagline: text('tagline'),
		shortDescription: text('short_description'),
		/** Long-form copy. */
		description: text('description'),
		/**
		 * The property's story (UST-15): a heading and long-form body. The body is raw markdown;
		 * rendering and sanitising belong to the page layer (Phase 2). Null means "no story yet".
		 */
		storyHeading: text('story_heading'),
		storyBody: text('story_body'),
		/** ISO-4217 code. Every price on this property is minor units in this currency. */
		currency: text('currency').notNull(),
		/** IANA timezone name, e.g. `Asia/Kuala_Lumpur`. */
		timezone: text('timezone').notNull(),
		/** Owners arrive in Phase 3, so this stays nullable until then. */
		ownerId: userRef('owner_id', 'set null'),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		...timestamps()
	},
	(t) => [
		check('property_currency_check', sql`${t.currency} ~ '^[A-Z]{3}$'`),
		check('property_story_heading_check', sql`${t.storyHeading} ~ '\\S'`),
		check('property_story_body_check', sql`${t.storyBody} ~ '\\S'`),
		index('property_owner_id_idx').on(t.ownerId),
		index('property_status_idx').on(t.status)
	]
);

/** Former slugs of a property, so old links can 301 to the current one (decision #1). */
export const propertySlugRedirect = pgTable(
	'property_slug_redirect',
	{
		id: id(),
		oldSlug: text('old_slug').notNull().unique(),
		propertyId: uuidRef('property_id')
			.notNull()
			.references(() => property.id, { onDelete: 'cascade' }),
		...timestamps()
	},
	(t) => [index('property_slug_redirect_property_id_idx').on(t.propertyId)]
);
