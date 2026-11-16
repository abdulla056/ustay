import { describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/test/db';
import { pgErrorCode } from '$lib/server/db/helpers';
import { bookingRequest, property, review, user } from '$lib/server/db/schema';
import { insertProperty, publishProperty } from '$lib/server/property/property.repo';
import {
	acceptRequest,
	createBookingRequest,
	createQuestion
} from '$lib/server/booking/booking.repo';
import {
	createGuestReview,
	createImportedReview,
	deleteImportedReview,
	displayName,
	findReviewById,
	getRatingSummary,
	listReviews,
	publishReview,
	rejectReview,
	ReviewAlreadyExistsError,
	ReviewBookingNotEligibleError,
	ReviewBookingNotFoundError,
	ReviewBookingPropertyError,
	ReviewNotFoundError,
	ReviewNotPublishedError,
	ReviewPropertyNotFoundError,
	ReviewSourceError,
	ReviewStayNotCompleteError,
	ReviewTransitionError,
	ReviewValidationError,
	setHostReply
} from './review.repo';

const BOOKED = new Date('2030-05-01T00:00:00Z');
const AFTER = new Date('2030-06-20T12:00:00Z');
const base = { type: 'boutique', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' } as const;
const guest = { guestName: 'Aisha Rahman', guestEmail: 'aisha@example.com' };
const stay = { checkIn: '2030-06-10', checkOut: '2030-06-13', adults: 2 };

async function makeProperty(name = 'Stay', timezone: string = base.timezone) {
	const p = await insertProperty({ ...base, timezone, name });
	return (await publishProperty(p.id))!;
}

/** A booking accepted at `BOOKED`; the review tests move the clock past (or before) check-out. */
async function acceptedBooking(propertyId: string, extra: Record<string, unknown> = {}) {
	const { request } = await createBookingRequest({
		propertyId,
		...guest,
		...stay,
		now: BOOKED,
		...extra
	});
	await acceptRequest(request.id, BOOKED);
	return request;
}

async function guestReview(propertyId: string, extra: Record<string, unknown> = {}) {
	const booking = await acceptedBooking(propertyId, extra.booking as Record<string, unknown>);
	return createGuestReview({
		propertyId,
		bookingRequestId: booking.id,
		rating: 5,
		body: 'Lovely stay',
		now: AFTER,
		...(extra.review as Record<string, unknown>)
	});
}

async function importedReview(propertyId: string, extra: Record<string, unknown> = {}) {
	return createImportedReview(propertyId, {
		origin: 'Google',
		rating: 4,
		body: 'Great place',
		authorName: 'Sam T.',
		...extra
	});
}

async function pgCode(promise: Promise<unknown>): Promise<string | undefined> {
	try {
		await promise;
	} catch (error) {
		return pgErrorCode(error);
	}
	return undefined;
}

const CHECK_VIOLATION = '23514';

/** A valid imported row to insert directly, bypassing the repo, to prove the CHECKs hold alone. */
function rawRow(propertyId: string, overrides: Record<string, unknown> = {}) {
	return {
		propertyId,
		source: 'imported' as const,
		origin: 'Google',
		rating: 4,
		body: 'Raw',
		authorName: 'Raw',
		...overrides
	} as typeof review.$inferInsert;
}

describe('review CHECK constraints', () => {
	it('rejects ratings outside 1 to 5', async () => {
		const p = await makeProperty();
		for (const rating of [0, 6, -1]) {
			expect(await pgCode(db.insert(review).values(rawRow(p.id, { rating })))).toBe(
				CHECK_VIOLATION
			);
		}
		await db.insert(review).values(rawRow(p.id, { rating: 1 }));
		await db.insert(review).values(rawRow(p.id, { rating: 5 }));
	});

	it('rejects a blank body, author name or title', async () => {
		const p = await makeProperty();
		for (const overrides of [{ body: '  ' }, { authorName: '' }, { title: '   ' }]) {
			expect(await pgCode(db.insert(review).values(rawRow(p.id, overrides)))).toBe(CHECK_VIOLATION);
		}
	});

	it('requires an imported review to have a non-blank origin and no booking', async () => {
		const p = await makeProperty();
		const booking = await acceptedBooking(p.id);
		for (const overrides of [{ origin: null }, { origin: ' ' }, { bookingRequestId: booking.id }]) {
			expect(await pgCode(db.insert(review).values(rawRow(p.id, overrides)))).toBe(CHECK_VIOLATION);
		}
	});

	it('forbids an origin on a guest review', async () => {
		const p = await makeProperty();
		const booking = await acceptedBooking(p.id);
		const row = rawRow(p.id, { source: 'guest', origin: 'Google', bookingRequestId: booking.id });
		expect(await pgCode(db.insert(review).values(row))).toBe(CHECK_VIOLATION);
	});

	it('sets host_reply and host_replied_at together or not at all, and not blank', async () => {
		const p = await makeProperty();
		for (const overrides of [
			{ hostReply: 'Thanks' },
			{ hostRepliedAt: new Date() },
			{ hostReply: ' ', hostRepliedAt: new Date() }
		]) {
			expect(await pgCode(db.insert(review).values(rawRow(p.id, overrides)))).toBe(CHECK_VIOLATION);
		}
	});

	it('sets published_at if and only if the status is published', async () => {
		const p = await makeProperty();
		for (const overrides of [
			{ status: 'published' as const, moderatedAt: new Date() },
			{ status: 'pending' as const, publishedAt: new Date() },
			{ status: 'rejected' as const, moderatedAt: new Date(), publishedAt: new Date() }
		]) {
			expect(await pgCode(db.insert(review).values(rawRow(p.id, overrides)))).toBe(CHECK_VIOLATION);
		}
		const now = new Date();
		await db
			.insert(review)
			.values(rawRow(p.id, { status: 'published', moderatedAt: now, publishedAt: now }));
	});

	it('sets moderated_at if and only if the status is not pending', async () => {
		const p = await makeProperty();
		const now = new Date();
		for (const overrides of [
			{ status: 'pending' as const, moderatedAt: now },
			{ status: 'rejected' as const },
			{ status: 'published' as const, publishedAt: now }
		]) {
			expect(await pgCode(db.insert(review).values(rawRow(p.id, overrides)))).toBe(CHECK_VIOLATION);
		}
		await db.insert(review).values(rawRow(p.id, { status: 'rejected', moderatedAt: now }));
	});
});

describe('createGuestReview (verified stay)', () => {
	it('creates a pending guest review from the booking', async () => {
		const p = await makeProperty();
		await db.insert(user).values({ id: 'acct-1', name: 'Aisha', email: 'acct@example.com' });
		const r = await guestReview(p.id, {
			booking: { guestUserId: 'acct-1' },
			review: { rating: 4, title: ' Great ', body: ' Lovely stay ' }
		});
		expect(r).toMatchObject({
			propertyId: p.id,
			source: 'guest',
			origin: null,
			rating: 4,
			title: 'Great',
			body: 'Lovely stay',
			authorName: 'Aisha R.',
			authorUserId: 'acct-1',
			stayedOn: '2030-06-10',
			status: 'pending',
			publishedAt: null,
			hostReply: null
		});
		expect(r.bookingRequestId).not.toBeNull();
		expect(JSON.stringify(r)).not.toContain('aisha@example.com');
	});

	it('accepts the day of check-out and rejects a name that is an email', async () => {
		const p = await makeProperty();
		const booking = await acceptedBooking(p.id);
		const input = { propertyId: p.id, bookingRequestId: booking.id, rating: 5, body: 'ok' };
		await expect(
			createGuestReview({ ...input, authorName: 'a@b.com', now: AFTER })
		).rejects.toBeInstanceOf(ReviewValidationError);
		// 2030-06-13 in Kuala Lumpur (UTC+8) has begun at 2030-06-12T16:00Z.
		const r = await createGuestReview({ ...input, now: new Date('2030-06-12T16:00:00Z') });
		expect(r.status).toBe('pending');
	});

	it('refuses a booking that is not accepted', async () => {
		const p = await makeProperty();
		const { request } = await createBookingRequest({
			propertyId: p.id,
			...guest,
			...stay,
			now: BOOKED
		});
		await expect(
			createGuestReview({
				propertyId: p.id,
				bookingRequestId: request.id,
				rating: 5,
				body: 'x',
				now: AFTER
			})
		).rejects.toBeInstanceOf(ReviewBookingNotEligibleError);
		const [{ status }] = await db
			.select()
			.from(bookingRequest)
			.where(eq(bookingRequest.id, request.id));
		expect(status).toBe('pending');
	});

	it('refuses a question', async () => {
		const p = await makeProperty();
		const { request } = await createQuestion({ propertyId: p.id, ...guest, now: BOOKED });
		await expect(
			createGuestReview({
				propertyId: p.id,
				bookingRequestId: request.id,
				rating: 5,
				body: 'x',
				now: AFTER
			})
		).rejects.toBeInstanceOf(ReviewBookingNotEligibleError);
	});

	it("refuses another property's booking", async () => {
		const a = await makeProperty('A');
		const b = await makeProperty('B');
		const booking = await acceptedBooking(a.id);
		await expect(
			createGuestReview({
				propertyId: b.id,
				bookingRequestId: booking.id,
				rating: 5,
				body: 'x',
				now: AFTER
			})
		).rejects.toBeInstanceOf(ReviewBookingPropertyError);
	});

	it('refuses an unknown or malformed booking and property', async () => {
		const p = await makeProperty();
		for (const bookingRequestId of ['nope', '00000000-0000-4000-8000-000000000000']) {
			await expect(
				createGuestReview({ propertyId: p.id, bookingRequestId, rating: 5, body: 'x' })
			).rejects.toBeInstanceOf(ReviewBookingNotFoundError);
		}
		await expect(
			createGuestReview({
				propertyId: 'nope',
				bookingRequestId: '00000000-0000-4000-8000-000000000000',
				rating: 5,
				body: 'x'
			})
		).rejects.toBeInstanceOf(ReviewPropertyNotFoundError);
	});

	it('refuses before check-out, judged in the property timezone', async () => {
		// now = 2030-06-10T12:00Z: it is already 2030-06-11 in Kiritimati (UTC+14) and still
		// 2030-06-10 in Pago Pago (UTC-11).
		const now = new Date('2030-06-10T12:00:00Z');
		const ahead = await makeProperty('Ahead', 'Pacific/Kiritimati');
		const behind = await makeProperty('Behind', 'Pacific/Pago_Pago');
		const early = { checkIn: '2030-06-09', checkOut: '2030-06-11' };
		const bookingAhead = await acceptedBooking(ahead.id, early);
		const bookingBehind = await acceptedBooking(behind.id, early);

		await expect(
			createGuestReview({
				propertyId: behind.id,
				bookingRequestId: bookingBehind.id,
				rating: 5,
				body: 'x',
				now
			})
		).rejects.toBeInstanceOf(ReviewStayNotCompleteError);
		const ok = await createGuestReview({
			propertyId: ahead.id,
			bookingRequestId: bookingAhead.id,
			rating: 5,
			body: 'x',
			now
		});
		expect(ok.status).toBe('pending');
	});

	it('refuses a second review of the same booking', async () => {
		const p = await makeProperty();
		const booking = await acceptedBooking(p.id);
		const input = {
			propertyId: p.id,
			bookingRequestId: booking.id,
			rating: 5,
			body: 'x',
			now: AFTER
		};
		await createGuestReview(input);
		await expect(createGuestReview(input)).rejects.toBeInstanceOf(ReviewAlreadyExistsError);
		expect(await db.select().from(review)).toHaveLength(1);
	});

	it('rejects invalid ratings and text before touching the database', async () => {
		const p = await makeProperty();
		const booking = await acceptedBooking(p.id);
		const ok = { propertyId: p.id, bookingRequestId: booking.id, rating: 5, body: 'x', now: AFTER };
		for (const bad of [
			{ rating: 0 },
			{ rating: 6 },
			{ rating: 4.5 },
			{ rating: '5' },
			{ body: ' ' },
			{ body: 'x'.repeat(5001) },
			{ title: 'x'.repeat(201) }
		]) {
			await expect(createGuestReview({ ...ok, ...bad } as never)).rejects.toBeInstanceOf(
				ReviewValidationError
			);
		}
	});

	it('names the guest "First L."', () => {
		expect(displayName('Aisha Rahman')).toBe('Aisha R.');
		expect(displayName('  Ana  Maria  de la Cruz ')).toBe('Ana C.');
		expect(displayName('Cher')).toBe('Cher');
	});

	it('never shows an email-like, blank or oversized guest name', async () => {
		expect(displayName('aisha@example.com')).toBe('Guest');
		expect(displayName('Aisha aisha@example.com')).toBe('Aisha');
		expect(displayName('   ')).toBe('Guest');
		expect(displayName('x'.repeat(201))).toBe('Guest');

		const p = await makeProperty();
		const emailName = await acceptedBooking(p.id, { guestName: 'aisha@example.com' });
		const long = await acceptedBooking(p.id, { guestEmail: 'b@example.com' });
		// The repo caps guest names at 200, so push an oversized one in directly.
		await db
			.update(bookingRequest)
			.set({ guestName: 'y'.repeat(300) })
			.where(eq(bookingRequest.id, long.id));
		for (const booking of [emailName, long]) {
			const r = await createGuestReview({
				propertyId: p.id,
				bookingRequestId: booking.id,
				rating: 5,
				body: 'x',
				now: AFTER
			});
			expect(r.authorName).toBe('Guest');
		}
	});
});

describe('createImportedReview', () => {
	it('creates a pending imported review with its origin and no booking', async () => {
		const p = await makeProperty();
		const r = await importedReview(p.id, { origin: ' Booking.com ', stayedOn: '2025-01-02' });
		expect(r).toMatchObject({
			source: 'imported',
			origin: 'Booking.com',
			bookingRequestId: null,
			status: 'pending',
			publishedAt: null,
			stayedOn: '2025-01-02'
		});
	});

	it('requires an origin', async () => {
		const p = await makeProperty();
		for (const origin of [undefined, null, '', '  ']) {
			await expect(importedReview(p.id, { origin })).rejects.toBeInstanceOf(ReviewValidationError);
		}
		await expect(importedReview(p.id, { stayedOn: '2029-13-40' })).rejects.toBeInstanceOf(
			ReviewValidationError
		);
	});

	it("refuses a stay date in the future in the property's timezone", async () => {
		// now = 2030-06-10T12:00Z: already 2030-06-11 in Kiritimati, still 2030-06-10 in Pago Pago.
		const now = new Date('2030-06-10T12:00:00Z');
		const ahead = await makeProperty('Ahead', 'Pacific/Kiritimati');
		const behind = await makeProperty('Behind', 'Pacific/Pago_Pago');
		expect((await importedReview(ahead.id, { stayedOn: '2030-06-11', now })).stayedOn).toBe(
			'2030-06-11'
		);
		await expect(importedReview(behind.id, { stayedOn: '2030-06-11', now })).rejects.toBeInstanceOf(
			ReviewValidationError
		);
		await importedReview(behind.id, { stayedOn: '2030-06-10', now });
	});

	it('refuses an unknown property', async () => {
		await expect(importedReview('nope')).rejects.toBeInstanceOf(ReviewPropertyNotFoundError);
		await expect(importedReview('00000000-0000-4000-8000-000000000000')).rejects.toBeInstanceOf(
			ReviewPropertyNotFoundError
		);
	});
});

describe('moderation', () => {
	it('publishes a pending review and stamps published_at from now', async () => {
		const p = await makeProperty();
		const r = await importedReview(p.id);
		const at = new Date('2030-07-01T09:00:00.123Z');
		const published = await publishReview(r.id, at);
		expect(published.status).toBe('published');
		expect(published.publishedAt).toEqual(at);
		expect(published.moderatedAt).toEqual(at);
	});

	it('rejects a pending review without a published_at', async () => {
		const p = await makeProperty();
		const r = await importedReview(p.id);
		const at = new Date('2030-07-01T09:00:00Z');
		const rejected = await rejectReview(r.id, at);
		expect(rejected.status).toBe('rejected');
		expect(rejected.moderatedAt).toEqual(at);
		expect(rejected.publishedAt).toBeNull();
	});

	it('moves only out of pending', async () => {
		const p = await makeProperty();
		const a = await importedReview(p.id);
		await publishReview(a.id);
		await expect(publishReview(a.id)).rejects.toBeInstanceOf(ReviewTransitionError);
		await expect(rejectReview(a.id)).rejects.toBeInstanceOf(ReviewTransitionError);
		const b = await importedReview(p.id);
		await rejectReview(b.id);
		await expect(publishReview(b.id)).rejects.toBeInstanceOf(ReviewTransitionError);
		expect((await findReviewById(a.id))?.status).toBe('published');
	});

	it('throws not found for an unknown or malformed id', async () => {
		for (const id of ['nope', '00000000-0000-4000-8000-000000000000']) {
			await expect(publishReview(id)).rejects.toBeInstanceOf(ReviewNotFoundError);
			await expect(rejectReview(id)).rejects.toBeInstanceOf(ReviewNotFoundError);
			await expect(setHostReply(id, 'x')).rejects.toBeInstanceOf(ReviewNotFoundError);
			await expect(deleteImportedReview(id)).rejects.toBeInstanceOf(ReviewNotFoundError);
			expect(await findReviewById(id)).toBeUndefined();
		}
	});
});

describe('host reply', () => {
	it('sets, replaces and clears a reply on a published review', async () => {
		const p = await makeProperty();
		const r = await guestReview(p.id);
		await publishReview(r.id);
		const at = new Date('2030-07-02T10:00:00Z');
		const set = await setHostReply(r.id, ' Thank you! ', at);
		expect(set).toMatchObject({ hostReply: 'Thank you!', hostRepliedAt: at });
		const later = new Date('2030-07-03T10:00:00Z');
		expect((await setHostReply(r.id, 'Welcome back', later)).hostRepliedAt).toEqual(later);
		for (const blank of [null, '', '   ']) {
			await setHostReply(r.id, 'again', at);
			const cleared = await setHostReply(r.id, blank);
			expect(cleared).toMatchObject({ hostReply: null, hostRepliedAt: null });
		}
	});

	it('refuses a new reply on a review that is not published', async () => {
		const p = await makeProperty();
		const r = await importedReview(p.id);
		await expect(setHostReply(r.id, 'hello')).rejects.toBeInstanceOf(ReviewNotPublishedError);
		await expect(setHostReply(r.id, null)).resolves.toMatchObject({ hostReply: null });
	});

	it('never changes the review text', async () => {
		const p = await makeProperty();
		const r = await guestReview(p.id);
		await publishReview(r.id);
		const after = await setHostReply(r.id, 'Thanks');
		expect(after).toMatchObject({ rating: r.rating, title: r.title, body: r.body });
	});
});

describe('deleteImportedReview', () => {
	it('deletes an imported review', async () => {
		const p = await makeProperty();
		const r = await importedReview(p.id);
		await deleteImportedReview(r.id);
		expect(await findReviewById(r.id)).toBeUndefined();
	});

	it('refuses a guest review', async () => {
		const p = await makeProperty();
		const r = await guestReview(p.id);
		await expect(deleteImportedReview(r.id)).rejects.toBeInstanceOf(ReviewSourceError);
		expect(await findReviewById(r.id)).toBeDefined();
	});
});

describe('getRatingSummary', () => {
	it('is empty with no published reviews', async () => {
		const p = await makeProperty();
		await importedReview(p.id); // pending, not counted
		expect(await getRatingSummary(p.id)).toEqual({
			count: 0,
			average: null,
			distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
			guestCount: 0,
			importedCount: 0
		});
		expect((await getRatingSummary('nope')).count).toBe(0);
	});

	it('counts only published reviews, with average, distribution and sources', async () => {
		const p = await makeProperty();
		const other = await makeProperty('Other');
		const live = [
			await guestReview(p.id, { review: { rating: 5 } }),
			await importedReview(p.id, { rating: 4 }),
			await importedReview(p.id, { rating: 4 }),
			await importedReview(p.id, { rating: 2 })
		];
		for (const r of live) await publishReview(r.id);
		await rejectReview((await importedReview(p.id, { rating: 1 })).id);
		await importedReview(p.id, { rating: 1 }); // pending
		await publishReview((await importedReview(other.id, { rating: 1 })).id);

		const summary = await getRatingSummary(p.id);
		expect(summary).toEqual({
			count: 4,
			average: 3.8, // 15 / 4 = 3.75, rounded half-up
			distribution: { 1: 0, 2: 1, 3: 0, 4: 2, 5: 1 },
			guestCount: 1,
			importedCount: 3
		});
	});
});

describe('listReviews', () => {
	it('lists published reviews newest-published first by default, filtered by source', async () => {
		const p = await makeProperty();
		const a = await importedReview(p.id);
		const b = await guestReview(p.id);
		const c = await importedReview(p.id);
		await publishReview(a.id, new Date('2030-07-01T00:00:00Z'));
		await publishReview(b.id, new Date('2030-07-03T00:00:00Z'));
		await publishReview(c.id, new Date('2030-07-02T00:00:00Z'));
		await importedReview(p.id); // pending, hidden from the default view

		expect((await listReviews(p.id)).items.map((r) => r.id)).toEqual([b.id, c.id, a.id]);
		expect((await listReviews(p.id, { source: 'imported' })).items.map((r) => r.id)).toEqual([
			c.id,
			a.id
		]);
		expect((await listReviews(p.id, { status: 'pending' })).items).toHaveLength(1);
		expect((await listReviews('nope')).items).toEqual([]);
	});

	it('pages with a keyset cursor, including reviews published in the same instant', async () => {
		const p = await makeProperty();
		const same = new Date('2030-07-05T00:00:00Z');
		const ids: string[] = [];
		for (let i = 0; i < 5; i += 1) {
			const r = await importedReview(p.id, { body: `Review ${i}` });
			await publishReview(r.id, i < 3 ? same : new Date(`2030-07-0${i}T00:00:00Z`));
			ids.push(r.id);
		}
		const seen: string[] = [];
		let cursor: string | null = null;
		let pages = 0;
		do {
			const page = await listReviews(p.id, { limit: 2, cursor });
			seen.push(...page.items.map((r) => r.id));
			cursor = page.nextCursor;
			pages += 1;
		} while (cursor);
		expect(pages).toBe(3);
		expect(new Set(seen).size).toBe(5);
		expect(new Set(seen)).toEqual(new Set(ids));
		const all = (await listReviews(p.id)).items.map((r) => r.id);
		expect(seen).toEqual(all);
	});

	it('pages exactly across timestamps that differ only below a millisecond', async () => {
		const p = await makeProperty();
		const ids: string[] = [];
		for (let i = 0; i < 4; i += 1) {
			const r = await importedReview(p.id);
			await publishReview(r.id, new Date('2030-07-05T00:00:00.123Z'));
			// 0.123001, 0.123002, ...: the same millisecond, different microseconds.
			await db.execute(
				sql`UPDATE review SET published_at = '2030-07-05 00:00:00.123000+00'::timestamptz + (${i + 1} * interval '1 microsecond') WHERE id = ${r.id}`
			);
			ids.push(r.id);
		}
		const seen: string[] = [];
		let cursor: string | null = null;
		do {
			const page = await listReviews(p.id, { limit: 1, cursor });
			seen.push(...page.items.map((r) => r.id));
			cursor = page.nextCursor;
		} while (cursor);
		expect(seen).toEqual([...ids].reverse());
	});

	it('lists the moderation queue oldest first and pages it', async () => {
		const p = await makeProperty();
		const ids: string[] = [];
		for (let i = 0; i < 4; i += 1) {
			const r = await importedReview(p.id, { body: `Queue ${i}` });
			await db.execute(
				sql`UPDATE review SET created_at = '2030-01-01 00:00:00+00'::timestamptz + (${i} * interval '1 hour') WHERE id = ${r.id}`
			);
			ids.push(r.id);
		}
		const rejected = await importedReview(p.id);
		await rejectReview(rejected.id);

		expect((await listReviews(p.id, { status: 'pending' })).items.map((r) => r.id)).toEqual(ids);
		const seen: string[] = [];
		let cursor: string | null = null;
		do {
			const page = await listReviews(p.id, { status: 'pending', limit: 3, cursor });
			seen.push(...page.items.map((r) => r.id));
			cursor = page.nextCursor;
		} while (cursor);
		expect(seen).toEqual(ids);
		expect((await listReviews(p.id, { status: 'rejected' })).items.map((r) => r.id)).toEqual([
			rejected.id
		]);
	});

	it('uses the (property, status, ...) indexes for both listings', async () => {
		const p = await makeProperty();
		const plan = (query: ReturnType<typeof sql>) =>
			db.transaction(async (tx) => {
				// A near-empty table would pick a seq scan; this asks which index the query can use.
				await tx.execute(sql`SET LOCAL enable_seqscan = off`);
				const rows = await tx.execute<{ 'QUERY PLAN': string }>(query);
				return rows.map((r) => r['QUERY PLAN']).join('\n');
			});
		const published = await plan(
			sql`EXPLAIN SELECT * FROM review WHERE property_id = ${p.id} AND status = 'published' ORDER BY published_at DESC NULLS LAST, id DESC LIMIT 21`
		);
		expect(published).toContain('review_property_id_status_published_at_idx');
		const queue = await plan(
			sql`EXPLAIN SELECT * FROM review WHERE property_id = ${p.id} AND status = 'pending' ORDER BY created_at ASC, id ASC LIMIT 21`
		);
		expect(queue).toContain('review_property_id_status_created_at_idx');
	});

	it('rejects a bad cursor, limit, status or source', async () => {
		const p = await makeProperty();
		for (const options of [
			{ cursor: 'garbage' },
			{ cursor: 'x|y' },
			{ cursor: '2030-07-05T00:00:00.123Z|00000000-0000-4000-8000-000000000000' },
			{ limit: 0 },
			{ limit: 101 },
			{ limit: 1.5 },
			{ status: 'nope' },
			{ source: 'nope' }
		]) {
			await expect(listReviews(p.id, options as never)).rejects.toBeInstanceOf(
				ReviewValidationError
			);
		}
	});
});

describe('deletion cascades', () => {
	it('keeps the review and nulls booking_request_id when the booking is deleted', async () => {
		const p = await makeProperty();
		const r = await guestReview(p.id);
		await db.delete(bookingRequest).where(eq(bookingRequest.id, r.bookingRequestId!));
		const after = await findReviewById(r.id);
		expect(after).toMatchObject({ source: 'guest', bookingRequestId: null, body: r.body });
	});

	it('nulls author_user_id and keeps the review when the account is deleted', async () => {
		const p = await makeProperty();
		await db.insert(user).values({ id: 'acct-2', name: 'Aisha', email: 'acct2@example.com' });
		const r = await guestReview(p.id, { booking: { guestUserId: 'acct-2' } });
		await db.delete(user).where(eq(user.id, 'acct-2'));
		expect((await findReviewById(r.id))?.authorUserId).toBeNull();
	});

	it('deletes a property’s reviews with it', async () => {
		const p = await makeProperty();
		await guestReview(p.id);
		await importedReview(p.id);
		await db.delete(property).where(eq(property.id, p.id));
		expect(await db.select().from(review)).toHaveLength(0);
	});

	it('resolves the relations', async () => {
		const p = await makeProperty();
		const r = await guestReview(p.id);
		const row = await db.query.review.findFirst({
			where: eq(review.id, r.id),
			with: { property: true, bookingRequest: true, authorUser: true }
		});
		expect(row?.property.id).toBe(p.id);
		expect(row?.bookingRequest?.id).toBe(r.bookingRequestId);
		const booking = await db.query.bookingRequest.findFirst({
			where: eq(bookingRequest.id, r.bookingRequestId!),
			with: { review: true }
		});
		expect(booking?.review?.id).toBe(r.id);
		const withReviews = await db.query.property.findFirst({
			where: eq(property.id, p.id),
			with: { reviews: true }
		});
		expect(withReviews?.reviews).toHaveLength(1);
	});
});
