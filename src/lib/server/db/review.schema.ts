/**
 * Reviews (UST-19). Two sources that are never blurred:
 *
 * - `guest`: a verified review tied to a completed stay on Ustay (`booking_request_id`, unique:
 *   one review per booking). `author_name` is a display name such as "Aisha R.", never an email.
 * - `imported`: an owner-entered review from elsewhere (Google, Booking.com...). It needs an
 *   `origin` label and no booking. The UI must always label it with that origin.
 *
 * Every review starts `pending`; moderation (`published` / `rejected`) is a platform action, so an
 * owner cannot put a fake review live. `booking_request_id` is `ON DELETE SET NULL` so a review
 * outlives its booking: the "guest review has a booking" rule is therefore enforced by the repo
 * at creation, not by a CHECK.
 *
 * Conventions: `docs/DATABASE.md`. Relations live in `./relations`.
 */
import { sql } from 'drizzle-orm';
import {
	check,
	date,
	index,
	pgEnum,
	pgTable,
	smallint,
	text,
	timestamp
} from 'drizzle-orm/pg-core';
import { bookingRequest } from './booking.schema';
import { id, timestamps, userRef, uuidRef } from './helpers';
import { property } from './property.schema';

export const reviewSources = ['guest', 'imported'] as const;
export const reviewSource = pgEnum('review_source', reviewSources);

export const reviewStatuses = ['pending', 'published', 'rejected'] as const;
export const reviewStatus = pgEnum('review_status', reviewStatuses);

export const review = pgTable(
	'review',
	{
		id: id(),
		propertyId: uuidRef('property_id')
			.notNull()
			.references(() => property.id, { onDelete: 'cascade' }),
		source: reviewSource('source').notNull(),
		/** The verified stay. Unique: one review per booking. Nulled if the booking is deleted. */
		bookingRequestId: uuidRef('booking_request_id')
			.unique()
			.references(() => bookingRequest.id, { onDelete: 'set null' }),
		/** Where an imported review came from ("Google"); null for guest reviews. */
		origin: text('origin'),
		/** Whole stars, 1 to 5. */
		rating: smallint('rating').notNull(),
		title: text('title'),
		body: text('body').notNull(),
		/** A display name ("Aisha R."), never an email address. */
		authorName: text('author_name').notNull(),
		authorUserId: userRef('author_user_id', 'set null'),
		/** Calendar date; for a guest review, the booking's `check_in`. */
		stayedOn: date('stayed_on', { mode: 'string' }),
		status: reviewStatus('status').notNull().default('pending'),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		hostReply: text('host_reply'),
		hostRepliedAt: timestamp('host_replied_at', { withTimezone: true }),
		...timestamps()
	},
	(t) => [
		check('review_rating_check', sql`${t.rating} BETWEEN 1 AND 5`),
		check('review_body_check', sql`${t.body} ~ '\\S'`),
		check('review_author_name_check', sql`${t.authorName} ~ '\\S'`),
		check('review_title_check', sql`${t.title} ~ '\\S'`),
		// A CHECK passes on NULL, so `origin ~ '\S'` is paired with the explicit source test.
		check(
			'review_source_check',
			sql`(${t.source} = 'guest' AND ${t.origin} IS NULL)
				OR (${t.source} = 'imported' AND ${t.origin} IS NOT NULL AND ${t.origin} ~ '\\S' AND ${t.bookingRequestId} IS NULL)`
		),
		check(
			'review_host_reply_check',
			sql`(${t.hostReply} IS NULL) = (${t.hostRepliedAt} IS NULL) AND ${t.hostReply} ~ '\\S'`
		),
		check(
			'review_published_at_check',
			sql`(${t.status} = 'published') = (${t.publishedAt} IS NOT NULL)`
		),
		index('review_property_id_status_published_at_idx').on(
			t.propertyId,
			t.status,
			t.publishedAt.desc()
		)
	]
);
