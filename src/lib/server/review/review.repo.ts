/**
 * Review repository (UST-19). The only module that talks Drizzle about `review`. Conventions:
 * `docs/ARCHITECTURE.md` ("Data access / repository layer") and `docs/DATABASE.md`. The executor
 * is the last param.
 *
 * Authorisation is NOT here. The routes (Phase 2 and later) must decide:
 * - who may write a guest review: the guest proving the booking, by its access token or by the
 *   signed-in account that owns it (`createGuestReview` only checks the booking's data);
 * - who may moderate (`publishReview`, `rejectReview`): the platform, never a property owner;
 * - who may reply (`setHostReply`) and delete an imported review: the property's owner.
 *
 * The repository offers no way to edit a guest review's `rating`, `title` or `body`, and
 * `deleteImportedReview` refuses guest reviews, so owners cannot rewrite or remove genuine
 * feedback through it.
 */
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { isUuid } from '$lib/server/db/helpers';
import { bookingRequest, review, reviewSources, reviewStatuses } from '$lib/server/db/schema';
import { isCalendarDate, todayInZone } from '$lib/server/booking/lifecycle';
import { findPropertyById } from '$lib/server/property/property.repo';
import { optionalText, requiredText, type ErrorFactory } from '$lib/server/validate';
import { averageRating } from './summary';

export { averageRating };

export type Review = typeof review.$inferSelect;
export type ReviewSource = (typeof reviewSources)[number];
export type ReviewStatus = (typeof reviewStatuses)[number];

const MAX_BODY_LENGTH = 5000;
const MAX_TITLE_LENGTH = 200;
const MAX_NAME_LENGTH = 200;
const MAX_ORIGIN_LENGTH = 100;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Thrown for input the types allow but the data model does not. */
export class ReviewValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ReviewValidationError';
	}
}

/** Thrown for an unknown or malformed review id. */
export class ReviewNotFoundError extends Error {
	constructor(readonly reviewId: string) {
		super(`Review ${reviewId} not found`);
		this.name = 'ReviewNotFoundError';
	}
}

/** Thrown when the property is unknown or malformed. */
export class ReviewPropertyNotFoundError extends Error {
	constructor(readonly propertyId: string) {
		super(`Property ${propertyId} not found`);
		this.name = 'ReviewPropertyNotFoundError';
	}
}

/** Thrown when the booking request does not exist or is malformed. */
export class ReviewBookingNotFoundError extends Error {
	constructor(readonly bookingRequestId: string) {
		super(`Booking request ${bookingRequestId} not found`);
		this.name = 'ReviewBookingNotFoundError';
	}
}

/** Thrown when the booking request belongs to another property. */
export class ReviewBookingPropertyError extends Error {
	constructor(
		readonly bookingRequestId: string,
		readonly propertyId: string
	) {
		super(`Booking request ${bookingRequestId} does not belong to property ${propertyId}`);
		this.name = 'ReviewBookingPropertyError';
	}
}

/** Thrown when the booking request is not an `accepted` booking (a question, or another status). */
export class ReviewBookingNotEligibleError extends Error {
	constructor(
		readonly bookingRequestId: string,
		readonly kind: string,
		readonly status: string
	) {
		super(`A ${kind} request in status ${status} cannot be reviewed`);
		this.name = 'ReviewBookingNotEligibleError';
	}
}

/** Thrown when the stay has not finished yet (`check_out` is after today in the property's zone). */
export class ReviewStayNotCompleteError extends Error {
	constructor(
		readonly bookingRequestId: string,
		readonly checkOut: string
	) {
		super(`The stay for booking request ${bookingRequestId} ends on ${checkOut}`);
		this.name = 'ReviewStayNotCompleteError';
	}
}

/** Thrown when the booking request already has a review. */
export class ReviewAlreadyExistsError extends Error {
	constructor(readonly bookingRequestId: string) {
		super(`Booking request ${bookingRequestId} already has a review`);
		this.name = 'ReviewAlreadyExistsError';
	}
}

/** Thrown for a moderation move out of anything but `pending`. */
export class ReviewTransitionError extends Error {
	constructor(
		readonly from: ReviewStatus,
		readonly to: ReviewStatus
	) {
		super(`A review cannot move from ${from} to ${to}`);
		this.name = 'ReviewTransitionError';
	}
}

/** Thrown when an action is not allowed for the review's source (deleting a guest review). */
export class ReviewSourceError extends Error {
	constructor(
		readonly reviewId: string,
		readonly source: ReviewSource
	) {
		super(`Review ${reviewId} is a ${source} review and cannot be changed this way`);
		this.name = 'ReviewSourceError';
	}
}

const fail: ErrorFactory = (m) => new ReviewValidationError(m);

function boundedText(value: unknown, field: string, max: number): string {
	const text = requiredText(value, field, fail);
	if (text.length > max)
		throw new ReviewValidationError(`${field} must be at most ${max} characters`);
	return text;
}

function optionalBoundedText(value: unknown, field: string, max: number): string | null {
	const text = optionalText(value ?? null, field, fail);
	if (text !== null && text.length > max) {
		throw new ReviewValidationError(`${field} must be at most ${max} characters`);
	}
	return text;
}

function ratingOf(value: unknown): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
		throw new ReviewValidationError('rating must be a whole number from 1 to 5');
	}
	return value;
}

function clock(value: unknown): Date {
	return value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();
}

/** `Aisha Rahman` -> `Aisha R.`; a single name is kept; never anything with an `@`. */
export function displayName(fullName: string): string {
	const parts = fullName.trim().split(/\s+/);
	if (parts.length < 2) return parts[0] ?? '';
	const last = [...parts[parts.length - 1]][0]?.toUpperCase() ?? '';
	return `${parts[0]} ${last}.`;
}

export type NewGuestReviewInput = {
	propertyId: string;
	bookingRequestId: string;
	rating: number;
	title?: string | null;
	body: string;
	/** Optional display-name override; defaults to the booking's guest name as "First L.". */
	authorName?: string;
	/** Test seam: the clock used for "the stay has finished". */
	now?: Date;
};

/**
 * Create a verified `guest` review, `pending` moderation. Requires an `accepted` `booking`
 * request of this property whose `check_out` is on or before today in the property's timezone,
 * with no review yet. Copies `stayed_on` from `check_in`, the account from `guest_user_id`, and a
 * display name (never the email) from the guest name. Each failure is its own typed error.
 * Proving the caller IS that guest is the route's job.
 */
export async function createGuestReview(
	input: NewGuestReviewInput,
	tx: Executor = db
): Promise<Review> {
	const raw = input as Record<string, unknown>;
	const rating = ratingOf(raw.rating);
	const title = optionalBoundedText(raw.title, 'title', MAX_TITLE_LENGTH);
	const body = boundedText(raw.body, 'body', MAX_BODY_LENGTH);
	const override =
		raw.authorName === undefined
			? null
			: boundedText(raw.authorName, 'authorName', MAX_NAME_LENGTH);
	if (override !== null && override.includes('@')) {
		throw new ReviewValidationError('authorName must be a display name, not an email address');
	}
	const now = clock(raw.now);

	try {
		return await tx.transaction(async (inner) => {
			const property = await findPropertyById(String(raw.propertyId), inner, { lock: 'share' });
			if (!property) throw new ReviewPropertyNotFoundError(String(raw.propertyId));

			const bookingId = String(raw.bookingRequestId);
			const [booking] = isUuid(bookingId)
				? await inner
						.select({
							propertyId: bookingRequest.propertyId,
							kind: bookingRequest.kind,
							status: bookingRequest.status,
							checkIn: bookingRequest.checkIn,
							checkOut: bookingRequest.checkOut,
							guestName: bookingRequest.guestName,
							guestUserId: bookingRequest.guestUserId
						})
						.from(bookingRequest)
						.where(eq(bookingRequest.id, bookingId))
						.for('share')
						.limit(1)
				: [];
			if (!booking) throw new ReviewBookingNotFoundError(bookingId);
			if (booking.propertyId !== property.id) {
				throw new ReviewBookingPropertyError(bookingId, property.id);
			}
			if (booking.kind !== 'booking' || booking.status !== 'accepted' || !booking.checkOut) {
				throw new ReviewBookingNotEligibleError(bookingId, booking.kind, booking.status);
			}
			if (booking.checkOut > todayInZone(property.timezone, now)) {
				throw new ReviewStayNotCompleteError(bookingId, booking.checkOut);
			}

			const [row] = await inner
				.insert(review)
				.values({
					propertyId: property.id,
					source: 'guest',
					bookingRequestId: bookingId,
					rating,
					title,
					body,
					authorName: override ?? displayName(booking.guestName),
					authorUserId: booking.guestUserId,
					stayedOn: booking.checkIn
				})
				.returning();
			return row;
		});
	} catch (error) {
		const e = error as { code?: string; cause?: { code?: string } };
		if ((e.cause?.code ?? e.code) === '23505') {
			throw new ReviewAlreadyExistsError(String(raw.bookingRequestId));
		}
		throw error;
	}
}

export type NewImportedReviewInput = {
	/** Where it came from, such as "Google" or "Booking.com". The UI always shows it. */
	origin: string;
	rating: number;
	title?: string | null;
	body: string;
	authorName: string;
	/** `YYYY-MM-DD`, when the reviewer stayed, if known. */
	stayedOn?: string | null;
};

/**
 * Create an owner-entered `imported` review, `pending` moderation like any other, so an owner
 * cannot publish their own. Needs an `origin` label and has no booking.
 */
export async function createImportedReview(
	propertyId: string,
	input: NewImportedReviewInput,
	tx: Executor = db
): Promise<Review> {
	const raw = input as Record<string, unknown>;
	const values = {
		origin: boundedText(raw.origin, 'origin', MAX_ORIGIN_LENGTH),
		rating: ratingOf(raw.rating),
		title: optionalBoundedText(raw.title, 'title', MAX_TITLE_LENGTH),
		body: boundedText(raw.body, 'body', MAX_BODY_LENGTH),
		authorName: boundedText(raw.authorName, 'authorName', MAX_NAME_LENGTH)
	};
	const stayedOn = raw.stayedOn ?? null;
	if (stayedOn !== null && !isCalendarDate(stayedOn)) {
		throw new ReviewValidationError('stayedOn must be a YYYY-MM-DD date');
	}
	return tx.transaction(async (inner) => {
		const property = await findPropertyById(String(propertyId), inner, { lock: 'share' });
		if (!property) throw new ReviewPropertyNotFoundError(String(propertyId));
		const [row] = await inner
			.insert(review)
			.values({ ...values, propertyId: property.id, source: 'imported', stayedOn })
			.returning();
		return row;
	});
}

/** Lock a review row for update. Throws {@link ReviewNotFoundError} for an unknown id. */
async function lockReview(reviewId: string, tx: Executor): Promise<Review> {
	if (!isUuid(reviewId)) throw new ReviewNotFoundError(String(reviewId));
	const [row] = await tx
		.select()
		.from(review)
		.where(eq(review.id, reviewId))
		.for('update')
		.limit(1);
	if (!row) throw new ReviewNotFoundError(reviewId);
	return row;
}

async function moderate(
	reviewId: string,
	to: 'published' | 'rejected',
	now: Date | undefined,
	tx: Executor
): Promise<Review> {
	const at = clock(now);
	return tx.transaction(async (inner) => {
		const current = await lockReview(reviewId, inner);
		if (current.status !== 'pending') throw new ReviewTransitionError(current.status, to);
		const [row] = await inner
			.update(review)
			.set({ status: to, publishedAt: to === 'published' ? at : null })
			.where(eq(review.id, reviewId))
			.returning();
		return row;
	});
}

/** `pending` -> `published`, stamping `published_at` from `now`. A platform action. */
export function publishReview(reviewId: string, now?: Date, tx: Executor = db): Promise<Review> {
	return moderate(reviewId, 'published', now, tx);
}

/** `pending` -> `rejected`. A platform action. */
export function rejectReview(reviewId: string, now?: Date, tx: Executor = db): Promise<Review> {
	return moderate(reviewId, 'rejected', now, tx);
}

/**
 * Set or clear the host's reply. A blank or `null` reply clears it (and `host_replied_at`); a set
 * reply stamps `host_replied_at` from `now`. Only a `published` review takes a new reply, so a
 * host cannot answer what the public cannot see; clearing is always allowed.
 */
export async function setHostReply(
	reviewId: string,
	reply: string | null,
	now?: Date,
	tx: Executor = db
): Promise<Review> {
	const text = optionalBoundedText(reply, 'reply', MAX_BODY_LENGTH);
	const at = clock(now);
	return tx.transaction(async (inner) => {
		const current = await lockReview(reviewId, inner);
		if (text !== null && current.status !== 'published') {
			throw new ReviewTransitionError(current.status, 'published');
		}
		const [row] = await inner
			.update(review)
			.set(
				text === null
					? { hostReply: null, hostRepliedAt: null }
					: { hostReply: text, hostRepliedAt: at }
			)
			.where(eq(review.id, reviewId))
			.returning();
		return row;
	});
}

/** Delete an owner-entered review. Throws {@link ReviewSourceError} for a guest review. */
export async function deleteImportedReview(reviewId: string, tx: Executor = db): Promise<void> {
	await tx.transaction(async (inner) => {
		const current = await lockReview(reviewId, inner);
		if (current.source !== 'imported') throw new ReviewSourceError(reviewId, current.source);
		await inner.delete(review).where(eq(review.id, reviewId));
	});
}

/** `undefined` for an unknown or malformed id. */
export async function findReviewById(
	reviewId: string,
	tx: Executor = db
): Promise<Review | undefined> {
	if (!isUuid(reviewId)) return undefined;
	const [row] = await tx.select().from(review).where(eq(review.id, reviewId)).limit(1);
	return row;
}

export type ListReviewsOptions = {
	/** Defaults to `published`, the public view. Use `pending` for the moderation queue. */
	status?: ReviewStatus;
	source?: ReviewSource;
	limit?: number;
	/** The `nextCursor` of the previous page. */
	cursor?: string | null;
};

export type ReviewPage = { items: Review[]; nextCursor: string | null };

/** The date a review is ordered by: when it went live, or (for unpublished ones) when created. */
const orderKey = (status: ReviewStatus) =>
	sql`date_trunc('milliseconds', ${status === 'published' ? review.publishedAt : review.createdAt})`;

function parseCursor(cursor: string): { at: Date; id: string } {
	const [iso, id, ...rest] = cursor.split('|');
	const at = new Date(iso ?? '');
	if (rest.length > 0 || Number.isNaN(at.getTime()) || !isUuid(id)) {
		throw new ReviewValidationError('cursor is not valid');
	}
	return { at, id };
}

/**
 * A property's reviews, newest first (by `published_at` for `published`, else `created_at`), as a
 * keyset page on `(timestamp, id)`: pass the returned `nextCursor` to get the next page, `null`
 * means the end. The order key is compared at millisecond precision, which is what the repo
 * writes and what a cursor can carry.
 */
export async function listReviews(
	propertyId: string,
	options: ListReviewsOptions = {},
	tx: Executor = db
): Promise<ReviewPage> {
	const status = options.status ?? 'published';
	if (!reviewStatuses.includes(status)) throw new ReviewValidationError('status is not valid');
	if (options.source !== undefined && !reviewSources.includes(options.source)) {
		throw new ReviewValidationError('source is not valid');
	}
	const limit = options.limit ?? DEFAULT_PAGE_SIZE;
	if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
		throw new ReviewValidationError(`limit must be an integer from 1 to ${MAX_PAGE_SIZE}`);
	}
	const cursor =
		options.cursor === undefined || options.cursor === null ? null : parseCursor(options.cursor);
	if (!isUuid(propertyId)) return { items: [], nextCursor: null };

	const key = orderKey(status);
	const conditions: SQL[] = [eq(review.propertyId, propertyId), eq(review.status, status)];
	if (options.source !== undefined) conditions.push(eq(review.source, options.source));
	if (cursor) {
		conditions.push(
			sql`(${key}, ${review.id}) < (${cursor.at.toISOString()}::timestamptz, ${cursor.id}::uuid)`
		);
	}
	const rows = await tx
		.select()
		.from(review)
		.where(and(...conditions))
		.orderBy(desc(key), desc(review.id))
		.limit(limit + 1);
	const items = rows.slice(0, limit);
	const last = items[items.length - 1];
	const lastAt = last && (status === 'published' ? last.publishedAt : last.createdAt);
	return {
		items,
		nextCursor: rows.length > limit && last && lastAt ? `${lastAt.toISOString()}|${last.id}` : null
	};
}

export type RatingSummary = {
	count: number;
	/** Mean rounded half-up to one decimal; `null` with no reviews. */
	average: number | null;
	/** Reviews per star, keyed 1 to 5. */
	distribution: Record<1 | 2 | 3 | 4 | 5, number>;
	guestCount: number;
	importedCount: number;
};

/**
 * The rating summary of a property's **published** reviews, from one aggregate query (computed on
 * read, nothing cached; see `docs/DATABASE.md` for when to change that).
 */
export async function getRatingSummary(
	propertyId: string,
	tx: Executor = db
): Promise<RatingSummary> {
	const star = (n: number) => sql<number>`(count(*) filter (where ${review.rating} = ${n}))::int`;
	const [row] = isUuid(propertyId)
		? await tx
				.select({
					count: sql<number>`count(*)::int`,
					sum: sql<number>`coalesce(sum(${review.rating}), 0)::int`,
					s1: star(1),
					s2: star(2),
					s3: star(3),
					s4: star(4),
					s5: star(5),
					guest: sql<number>`(count(*) filter (where ${review.source} = 'guest'))::int`,
					imported: sql<number>`(count(*) filter (where ${review.source} = 'imported'))::int`
				})
				.from(review)
				.where(and(eq(review.propertyId, propertyId), eq(review.status, 'published')))
		: [];
	if (!row) {
		return {
			count: 0,
			average: null,
			distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
			guestCount: 0,
			importedCount: 0
		};
	}
	return {
		count: row.count,
		average: averageRating(row.sum, row.count),
		distribution: { 1: row.s1, 2: row.s2, 3: row.s3, 4: row.s4, 5: row.s5 },
		guestCount: row.guest,
		importedCount: row.imported
	};
}
