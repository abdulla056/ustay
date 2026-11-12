import { describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/test/db';
import { bookingMessage, bookingRequest, property, user } from '$lib/server/db/schema';
import { insertProperty, publishProperty } from '$lib/server/property/property.repo';
import { deleteRoom, insertRoom, updateRoom } from '$lib/server/property/room.repo';
import {
	acceptRequest,
	addMessage,
	BookingPropertyUnavailableError,
	BookingRequestNotFoundError,
	BookingRoomError,
	BookingTransitionError,
	BookingValidationError,
	cancelRequest,
	closeQuestion,
	createBookingRequest,
	createQuestion,
	declineRequest,
	expireStaleRequests,
	findBookingRequestByAccessToken,
	findBookingRequestById,
	findBookingRequestByReference,
	listBookingRequests,
	listGuestRequests,
	listMessages,
	REQUEST_TTL_MS
} from './booking.repo';
import { hashAccessToken } from './lifecycle';

const NOW = new Date('2026-06-01T12:00:00Z');
const base = { type: 'boutique', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' } as const;

async function makeProperty(name = 'Stay', opts: { publish?: boolean } = {}) {
	const p = await insertProperty({ ...base, name });
	return opts.publish === false ? p : (await publishProperty(p.id))!;
}

const guest = { guestName: 'Ada Guest', guestEmail: 'ada@example.com' };
const stay = { checkIn: '2026-07-10', checkOut: '2026-07-13', adults: 2 };

async function makeBooking(propertyId: string, extra: Record<string, unknown> = {}) {
	return createBookingRequest({ propertyId, ...guest, ...stay, now: NOW, ...extra });
}

async function pgCode(promise: Promise<unknown>): Promise<string | undefined> {
	try {
		await promise;
	} catch (error) {
		const e = error as { code?: string; cause?: { code?: string } };
		return e.cause?.code ?? e.code;
	}
	return undefined;
}

const CHECK_VIOLATION = '23514';

/** A valid row to insert directly, bypassing the repo, to prove the CHECKs hold on their own. */
function rawRow(propertyId: string, overrides: Record<string, unknown> = {}) {
	return {
		propertyId,
		reference: `UST-RAW${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
		kind: 'booking' as const,
		checkIn: '2026-07-10',
		checkOut: '2026-07-12',
		adults: 2,
		children: 0,
		guestName: 'Raw',
		guestEmail: 'raw@example.com',
		expiresAt: new Date(),
		currency: 'MYR',
		guestAccessTokenHash: `hash-${Math.random()}`,
		...overrides
	} as typeof bookingRequest.$inferInsert;
}

async function expectInvalid(promise: Promise<unknown>, error: new (...a: never[]) => Error) {
	await expect(promise).rejects.toBeInstanceOf(error);
}

describe('createBookingRequest', () => {
	it('creates a pending booking with a reference, a 72 hour expiry and the opening message', async () => {
		const p = await makeProperty();
		const { request, accessToken } = await makeBooking(p.id, { message: '  Late arrival  ' });
		expect(request).toMatchObject({
			propertyId: p.id,
			kind: 'booking',
			status: 'pending',
			checkIn: '2026-07-10',
			checkOut: '2026-07-13',
			adults: 2,
			children: 0,
			currency: 'MYR',
			message: 'Late arrival',
			roomId: null,
			nightlyRateMinor: null,
			estimatedTotalMinor: null
		});
		expect(request.reference).toMatch(/^UST-[A-HJ-NP-Z2-9]{6}$/);
		expect(request.expiresAt.getTime()).toBe(NOW.getTime() + REQUEST_TTL_MS);
		expect(accessToken.length).toBeGreaterThanOrEqual(43);
		expect('guestAccessTokenHash' in request).toBe(false);

		const thread = await listMessages(request.id);
		expect(thread).toHaveLength(1);
		expect(thread[0]).toMatchObject({ sender: 'guest', body: 'Late arrival' });
	});

	it('writes no opening message when there is no note', async () => {
		const p = await makeProperty();
		const { request } = await makeBooking(p.id, { message: '   ' });
		expect(request.message).toBeNull();
		expect(await listMessages(request.id)).toEqual([]);
	});

	it('normalises the email and validates its shape', async () => {
		const p = await makeProperty();
		const { request } = await makeBooking(p.id, { guestEmail: '  Ada.Guest@Example.COM ' });
		expect(request.guestEmail).toBe('ada.guest@example.com');
		for (const bad of ['nope', 'a@b', '@x.com', 'a b@x.com', 'a@@x.com', '', 'é@x.com']) {
			await expectInvalid(makeBooking(p.id, { guestEmail: bad }), BookingValidationError);
		}
	});

	it('requires a name and rejects non-string fields with typed errors', async () => {
		const p = await makeProperty();
		await expectInvalid(makeBooking(p.id, { guestName: '   ' }), BookingValidationError);
		await expectInvalid(makeBooking(p.id, { guestName: 7 }), BookingValidationError);
		await expectInvalid(makeBooking(p.id, { guestPhone: 5 }), BookingValidationError);
		await expectInvalid(makeBooking(p.id, { message: { a: 1 } }), BookingValidationError);
		await expectInvalid(makeBooking(p.id, { message: 'x'.repeat(5001) }), BookingValidationError);
	});

	it('stores a phone and links an existing account only', async () => {
		const p = await makeProperty();
		await db.insert(user).values({ id: 'guest-1', name: 'Ada', email: 'ada-account@example.com' });
		const { request } = await makeBooking(p.id, {
			guestPhone: ' +60 12 345 ',
			guestUserId: 'guest-1'
		});
		expect(request.guestPhone).toBe('+60 12 345');
		expect(request.guestUserId).toBe('guest-1');
		await expectInvalid(makeBooking(p.id, { guestUserId: 'ghost' }), BookingValidationError);
	});

	it('validates the dates', async () => {
		const p = await makeProperty();
		const bad = [
			{ checkIn: '2026-07-10', checkOut: '2026-07-10' },
			{ checkIn: '2026-07-13', checkOut: '2026-07-10' },
			{ checkIn: '2026-02-30', checkOut: '2026-03-02' },
			{ checkIn: '10/07/2026', checkOut: '2026-07-12' },
			{ checkIn: undefined, checkOut: '2026-07-12' },
			{ checkIn: '2026-07-10', checkOut: 20260712 }
		];
		for (const dates of bad) await expectInvalid(makeBooking(p.id, dates), BookingValidationError);
	});

	it("rejects a past check-in by the property's own calendar", async () => {
		const p = await makeProperty();
		// 2026-06-01 20:00 UTC is already 2026-06-02 in Kuala Lumpur (UTC+8).
		const late = new Date('2026-06-01T20:00:00Z');
		await expectInvalid(
			makeBooking(p.id, { checkIn: '2026-06-01', checkOut: '2026-06-03', now: late }),
			BookingValidationError
		);
		const { request } = await makeBooking(p.id, {
			checkIn: '2026-06-02',
			checkOut: '2026-06-03',
			now: late
		});
		expect(request.checkIn).toBe('2026-06-02');
		await expectInvalid(
			makeBooking(p.id, { checkIn: '2020-01-01', checkOut: '2020-01-03' }),
			BookingValidationError
		);
	});

	it('validates the party', async () => {
		const p = await makeProperty();
		for (const adults of [0, -1, 1.5, '2', null, undefined, 2 ** 31]) {
			await expectInvalid(makeBooking(p.id, { adults }), BookingValidationError);
		}
		for (const children of [-1, 0.5, '1', null]) {
			await expectInvalid(makeBooking(p.id, { children }), BookingValidationError);
		}
		const { request } = await makeBooking(p.id, { children: 2 });
		expect(request.children).toBe(2);
	});

	it('only accepts requests for a published property', async () => {
		const draft = await makeProperty('Draft', { publish: false });
		await expectInvalid(makeBooking(draft.id), BookingPropertyUnavailableError);
		await expectInvalid(
			createQuestion({ propertyId: draft.id, ...guest }),
			BookingPropertyUnavailableError
		);
		const archived = await makeProperty('Archived');
		await db.update(property).set({ status: 'archived' }).where(eq(property.id, archived.id));
		await expectInvalid(makeBooking(archived.id), BookingPropertyUnavailableError);
		await expectInvalid(makeBooking('not-a-uuid'), BookingPropertyUnavailableError);
		await expectInvalid(
			makeBooking('00000000-0000-4000-8000-000000000000'),
			BookingPropertyUnavailableError
		);
	});

	it('rejects a room from another property, or a bad room id', async () => {
		const a = await makeProperty('A');
		const b = await makeProperty('B');
		const other = await insertRoom({
			propertyId: b.id,
			name: 'Elsewhere',
			maxGuests: 2,
			nightlyRateMinor: 100
		});
		await expectInvalid(makeBooking(a.id, { roomId: other.id }), BookingRoomError);
		await expectInvalid(makeBooking(a.id, { roomId: 'nope' }), BookingRoomError);
		await expectInvalid(
			makeBooking(a.id, { roomId: '00000000-0000-4000-8000-000000000000' }),
			BookingRoomError
		);
		expect(await listBookingRequests(a.id)).toEqual([]);
	});

	it('snapshots nightly rate x nights exactly, and survives a later rate change', async () => {
		const p = await makeProperty();
		const r = await insertRoom({
			propertyId: p.id,
			name: 'Suite',
			maxGuests: 2,
			nightlyRateMinor: 15050
		});
		const { request } = await makeBooking(p.id, { roomId: r.id });
		expect(request).toMatchObject({
			roomId: r.id,
			currency: 'MYR',
			nightlyRateMinor: 15050,
			estimatedTotalMinor: 45150
		});
		await updateRoom(r.id, { nightlyRateMinor: 99999 });
		const again = await findBookingRequestById(request.id);
		expect(again).toMatchObject({ nightlyRateMinor: 15050, estimatedTotalMinor: 45150 });
	});

	it('copies the property currency, and refuses a total that overflows', async () => {
		const p = await insertProperty({ ...base, name: 'Yen', currency: 'JPY' });
		await publishProperty(p.id);
		const r = await insertRoom({
			propertyId: p.id,
			name: 'Room',
			maxGuests: 2,
			nightlyRateMinor: 2_000_000_000
		});
		await expectInvalid(
			makeBooking(p.id, { roomId: r.id, checkIn: '2026-07-10', checkOut: '2026-07-12' }),
			BookingValidationError
		);
		const { request } = await makeBooking(p.id, { checkOut: '2026-07-11' });
		expect(request.currency).toBe('JPY');
	});

	it("ignores smuggled fields: status, expiry, token hash and reference are the repo's", async () => {
		const p = await makeProperty();
		const { request } = await makeBooking(p.id, {
			status: 'accepted',
			reference: 'UST-HACKED',
			expiresAt: new Date(0),
			guestAccessTokenHash: 'mine',
			respondedAt: new Date(),
			currency: 'USD',
			estimatedTotalMinor: 1
		});
		expect(request.status).toBe('pending');
		expect(request.reference).not.toBe('UST-HACKED');
		expect(request.currency).toBe('MYR');
		expect(request.respondedAt).toBeNull();
		expect(request.expiresAt.getTime()).toBe(NOW.getTime() + REQUEST_TTL_MS);
	});

	it('does not block dates: overlapping requests are all accepted', async () => {
		const p = await makeProperty();
		await makeBooking(p.id);
		await makeBooking(p.id);
		expect(await listBookingRequests(p.id)).toHaveLength(2);
	});
});

describe('createQuestion', () => {
	it('creates a pending question with no dates, room or price', async () => {
		const p = await makeProperty();
		const { request, accessToken } = await createQuestion({
			propertyId: p.id,
			...guest,
			message: 'Is the villa pet-friendly?',
			now: NOW
		});
		expect(request).toMatchObject({
			kind: 'question',
			status: 'pending',
			checkIn: null,
			checkOut: null,
			roomId: null,
			adults: null,
			children: null,
			nightlyRateMinor: null,
			estimatedTotalMinor: null,
			currency: 'MYR'
		});
		expect(accessToken).toBeTruthy();
		expect((await listMessages(request.id))[0]).toMatchObject({
			sender: 'guest',
			body: 'Is the villa pet-friendly?'
		});
	});

	it('ignores dates and rooms passed to a question', async () => {
		const p = await makeProperty();
		const r = await insertRoom({
			propertyId: p.id,
			name: 'R',
			maxGuests: 2,
			nightlyRateMinor: 100
		});
		const { request } = await createQuestion({
			propertyId: p.id,
			...guest,
			...({ checkIn: '2026-07-10', roomId: r.id, adults: 2 } as object)
		});
		expect(request).toMatchObject({ checkIn: null, roomId: null, adults: null });
	});
});

describe('lookups', () => {
	it('finds by id, by reference (any case) and by access token (hash lookup)', async () => {
		const p = await makeProperty();
		const { request, accessToken } = await makeBooking(p.id);
		expect(await findBookingRequestById(request.id)).toEqual(request);
		expect(await findBookingRequestByReference(request.reference.toLowerCase())).toEqual(request);
		expect(await findBookingRequestByAccessToken(accessToken)).toEqual(request);
	});

	it('returns undefined for unknown or malformed input without a Postgres error', async () => {
		expect(await findBookingRequestById('nope')).toBeUndefined();
		expect(await findBookingRequestById('00000000-0000-4000-8000-000000000000')).toBeUndefined();
		expect(await findBookingRequestByReference('UST-NOPE22')).toBeUndefined();
		expect(await findBookingRequestByReference(undefined as never)).toBeUndefined();
		expect(await findBookingRequestByAccessToken('short')).toBeUndefined();
		expect(await findBookingRequestByAccessToken('a'.repeat(43))).toBeUndefined();
		expect(await findBookingRequestByAccessToken(undefined as never)).toBeUndefined();
	});

	it('stores only the token hash, never the plain token', async () => {
		const p = await makeProperty();
		const { request, accessToken } = await makeBooking(p.id);
		const [row] = await db.select().from(bookingRequest).where(eq(bookingRequest.id, request.id));
		expect(row.guestAccessTokenHash).toBe(await hashAccessToken(accessToken));
		expect(row.guestAccessTokenHash).not.toBe(accessToken);
		expect(JSON.stringify(row)).not.toContain(accessToken);
		const rawHits = await db.execute(
			sql`SELECT 1 FROM booking_request br, booking_message bm WHERE br::text LIKE ${'%' + accessToken + '%'} OR bm::text LIKE ${'%' + accessToken + '%'}`
		);
		expect(rawHits).toHaveLength(0);
	});

	it('lists the inbox newest first, filtered by status and kind', async () => {
		const p = await makeProperty();
		const other = await makeProperty('Other');
		const first = (await makeBooking(p.id)).request;
		const q = (await createQuestion({ propertyId: p.id, ...guest })).request;
		const third = (await makeBooking(p.id)).request;
		await makeBooking(other.id);
		await declineRequest(first.id);

		expect((await listBookingRequests(p.id)).map((r) => r.id)).toEqual([third.id, q.id, first.id]);
		expect((await listBookingRequests(p.id, { status: 'pending' })).map((r) => r.id)).toEqual([
			third.id,
			q.id
		]);
		expect((await listBookingRequests(p.id, { kind: 'question' })).map((r) => r.id)).toEqual([
			q.id
		]);
		expect(await listBookingRequests(p.id, { status: 'accepted' })).toEqual([]);
		expect(await listBookingRequests('nope')).toEqual([]);
		await expectInvalid(
			listBookingRequests(p.id, { status: 'bogus' as never }),
			BookingValidationError
		);
	});

	it('lists a guest history by email (case-insensitive) and by account', async () => {
		const p = await makeProperty();
		const q = await makeProperty('Q');
		await db.insert(user).values({ id: 'u-1', name: 'Ada', email: 'acct@example.com' });
		const a = (await makeBooking(p.id)).request;
		const b = (
			await createQuestion({
				propertyId: q.id,
				...guest,
				guestEmail: 'Other@x.com',
				guestUserId: 'u-1'
			})
		).request;
		await makeBooking(p.id, { guestEmail: 'someone@else.com' });

		expect((await listGuestRequests({ email: 'ADA@example.com' })).map((r) => r.id)).toEqual([
			a.id
		]);
		expect((await listGuestRequests({ userId: 'u-1' })).map((r) => r.id)).toEqual([b.id]);
		const both = await listGuestRequests({ email: 'ada@example.com', userId: 'u-1' });
		expect(both.map((r) => r.id)).toEqual([b.id, a.id]);
		expect(await listGuestRequests({})).toEqual([]);
		await expectInvalid(listGuestRequests({ email: 'bad' }), BookingValidationError);
	});
});

describe('lifecycle transitions', () => {
	it('pending booking -> accepted / declined / cancelled, stamping the right timestamp', async () => {
		const p = await makeProperty();
		const a = (await makeBooking(p.id)).request;
		const accepted = await acceptRequest(a.id);
		expect(accepted.status).toBe('accepted');
		expect(accepted.respondedAt).toBeInstanceOf(Date);
		expect(accepted.cancelledAt).toBeNull();

		const d = await declineRequest((await makeBooking(p.id)).request.id);
		expect(d.status).toBe('declined');
		expect(d.respondedAt).toBeInstanceOf(Date);

		const c = await cancelRequest((await makeBooking(p.id)).request.id);
		expect(c.status).toBe('cancelled');
		expect(c.cancelledAt).toBeInstanceOf(Date);
		expect(c.respondedAt).toBeNull();
	});

	it('accepted -> cancelled keeps responded_at and sets cancelled_at', async () => {
		const p = await makeProperty();
		const { id } = (await makeBooking(p.id)).request;
		const accepted = await acceptRequest(id);
		const cancelled = await cancelRequest(id);
		expect(cancelled.status).toBe('cancelled');
		expect(cancelled.respondedAt).toEqual(accepted.respondedAt);
		expect(cancelled.cancelledAt).toBeInstanceOf(Date);
	});

	it('pending question -> closed', async () => {
		const p = await makeProperty();
		const { id } = (await createQuestion({ propertyId: p.id, ...guest })).request;
		const closed = await closeQuestion(id);
		expect(closed.status).toBe('closed');
	});

	it('forbids every other move with BookingTransitionError and changes nothing', async () => {
		const p = await makeProperty();
		const terminal = async (to: 'declined' | 'cancelled') => {
			const { id } = (await makeBooking(p.id)).request;
			await (to === 'declined' ? declineRequest(id) : cancelRequest(id));
			return id;
		};
		const declined = await terminal('declined');
		const cancelled = await terminal('cancelled');
		const accepted = (await makeBooking(p.id)).request.id;
		await acceptRequest(accepted);
		const expired = (await makeBooking(p.id)).request.id;
		await expireStaleRequests(new Date(NOW.getTime() + REQUEST_TTL_MS + 1000));
		const pendingBooking = (await makeBooking(p.id)).request.id;
		const pendingQuestion = (await createQuestion({ propertyId: p.id, ...guest })).request.id;
		const closedQuestion = (await createQuestion({ propertyId: p.id, ...guest })).request.id;
		await closeQuestion(closedQuestion);

		const attempts: [string, () => Promise<unknown>][] = [
			['accept declined', () => acceptRequest(declined)],
			['decline declined', () => declineRequest(declined)],
			['cancel declined', () => cancelRequest(declined)],
			['accept cancelled', () => acceptRequest(cancelled)],
			['cancel cancelled', () => cancelRequest(cancelled)],
			['accept accepted', () => acceptRequest(accepted)],
			['decline accepted', () => declineRequest(accepted)],
			['accept expired', () => acceptRequest(expired)],
			['decline expired', () => declineRequest(expired)],
			['cancel expired', () => cancelRequest(expired)],
			['close a booking', () => closeQuestion(pendingBooking)],
			['accept a question', () => acceptRequest(pendingQuestion)],
			['decline a question', () => declineRequest(pendingQuestion)],
			['cancel a question', () => cancelRequest(pendingQuestion)],
			['close a closed question', () => closeQuestion(closedQuestion)]
		];
		for (const [label, run] of attempts) {
			await expect(run(), label).rejects.toBeInstanceOf(BookingTransitionError);
		}
		expect((await findBookingRequestById(declined))?.status).toBe('declined');
		expect(await listMessages(declined)).toHaveLength(1);
	});

	it('throws BookingRequestNotFoundError for an unknown or malformed id', async () => {
		await expectInvalid(acceptRequest('nope'), BookingRequestNotFoundError);
		await expectInvalid(
			closeQuestion('00000000-0000-4000-8000-000000000000'),
			BookingRequestNotFoundError
		);
	});

	it('appends a system message per transition, in the same transaction', async () => {
		const p = await makeProperty();
		const { id } = (await makeBooking(p.id, { message: 'Hello' })).request;
		await acceptRequest(id);
		await cancelRequest(id);
		const thread = await listMessages(id);
		expect(thread.map((m) => [m.sender, m.body])).toEqual([
			['guest', 'Hello'],
			['system', 'Request accepted'],
			['system', 'Request cancelled']
		]);

		const d = (await makeBooking(p.id)).request.id;
		await declineRequest(d);
		expect((await listMessages(d)).map((m) => m.body)).toEqual(['Request declined']);
		const q = (await createQuestion({ propertyId: p.id, ...guest })).request.id;
		await closeQuestion(q);
		expect((await listMessages(q)).map((m) => m.body)).toEqual(['Question closed']);

		// A refused transition writes no message, and a failure rolls the status back with it.
		await expect(acceptRequest(id)).rejects.toBeInstanceOf(BookingTransitionError);
		expect(await listMessages(id)).toHaveLength(3);
	});

	it('serialises concurrent transitions: exactly one wins', async () => {
		const p = await makeProperty();
		const { id } = (await makeBooking(p.id)).request;
		const results = await Promise.allSettled([acceptRequest(id), declineRequest(id)]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(
			results.filter((r) => r.status === 'rejected' && r.reason instanceof BookingTransitionError)
		).toHaveLength(1);
		expect(await listMessages(id)).toHaveLength(1);
	});
});

describe('expireStaleRequests', () => {
	it('expires only overdue pending bookings, in one pass, with a system message each', async () => {
		const p = await makeProperty();
		const overdue1 = (await makeBooking(p.id)).request.id;
		const overdue2 = (await makeBooking(p.id)).request.id;
		const accepted = (await makeBooking(p.id)).request.id;
		await acceptRequest(accepted);
		const fresh = (await makeBooking(p.id, { now: new Date(NOW.getTime() + 24 * 3600_000) }))
			.request.id;
		const question = (await createQuestion({ propertyId: p.id, ...guest, now: NOW })).request.id;

		const ids = await expireStaleRequests(new Date(NOW.getTime() + REQUEST_TTL_MS + 1000));
		expect(ids.sort()).toEqual([overdue1, overdue2].sort());
		for (const id of ids) {
			expect((await findBookingRequestById(id))?.status).toBe('expired');
			expect((await listMessages(id)).map((m) => [m.sender, m.body])).toEqual([
				['system', 'Request expired without a reply']
			]);
		}
		expect((await findBookingRequestById(accepted))?.status).toBe('accepted');
		expect((await findBookingRequestById(fresh))?.status).toBe('pending');
		expect((await findBookingRequestById(question))?.status).toBe('pending');
		expect(await expireStaleRequests(new Date(NOW.getTime() + REQUEST_TTL_MS + 1000))).toEqual([]);
	});

	it('treats the expiry instant itself as overdue, and defaults to the current time', async () => {
		const p = await makeProperty();
		const { id } = (await makeBooking(p.id)).request;
		expect(await expireStaleRequests(new Date(NOW.getTime() + REQUEST_TTL_MS - 1))).toEqual([]);
		expect(await expireStaleRequests(new Date(NOW.getTime() + REQUEST_TTL_MS))).toEqual([id]);
		const future = (
			await makeBooking(p.id, { checkIn: '2099-07-10', checkOut: '2099-07-12', now: new Date() })
		).request.id;
		expect(await expireStaleRequests()).not.toContain(future);
	});
});

describe('messages', () => {
	it('appends and lists oldest first, with an optional author account', async () => {
		const p = await makeProperty();
		const { id } = (await makeBooking(p.id)).request;
		await db.insert(user).values({ id: 'host-1', name: 'Host', email: 'host@example.com' });
		const m1 = await addMessage(id, { sender: 'host', authorUserId: 'host-1', body: ' Welcome ' });
		const m2 = await addMessage(id, { sender: 'guest', body: 'Thanks' });
		expect(m1).toMatchObject({ sender: 'host', authorUserId: 'host-1', body: 'Welcome' });
		expect(m2.authorUserId).toBeNull();
		expect((await listMessages(id)).map((m) => m.body)).toEqual(['Welcome', 'Thanks']);
	});

	it('rejects bad input with typed errors', async () => {
		const p = await makeProperty();
		const { id } = (await makeBooking(p.id)).request;
		await expectInvalid(addMessage(id, { sender: 'guest', body: '  ' }), BookingValidationError);
		await expectInvalid(
			addMessage(id, { sender: 'guest', body: 5 as never }),
			BookingValidationError
		);
		await expectInvalid(
			addMessage(id, { sender: 'robot' as never, body: 'x' }),
			BookingValidationError
		);
		await expectInvalid(
			addMessage(id, { sender: 'host', authorUserId: 'ghost', body: 'x' }),
			BookingValidationError
		);
		await expectInvalid(
			addMessage('nope', { sender: 'guest', body: 'x' }),
			BookingRequestNotFoundError
		);
		await expectInvalid(
			addMessage('00000000-0000-4000-8000-000000000000', { sender: 'guest', body: 'x' }),
			BookingRequestNotFoundError
		);
		expect(await listMessages('nope')).toEqual([]);
	});

	it('cascade when the request is deleted, and the author is nulled with the account', async () => {
		const p = await makeProperty();
		const { id } = (await makeBooking(p.id, { message: 'hi' })).request;
		await db.insert(user).values({ id: 'host-2', name: 'Host', email: 'host2@example.com' });
		await addMessage(id, { sender: 'host', authorUserId: 'host-2', body: 'x' });
		await db.delete(user).where(eq(user.id, 'host-2'));
		expect((await listMessages(id)).every((m) => m.authorUserId === null)).toBe(true);
		await db.delete(bookingRequest).where(eq(bookingRequest.id, id));
		expect(
			await db.select().from(bookingMessage).where(eq(bookingMessage.bookingRequestId, id))
		).toEqual([]);
	});
});

describe('relationships and deletes', () => {
	it('deleting a room nulls room_id and keeps the request and its snapshot', async () => {
		const p = await makeProperty();
		const r = await insertRoom({
			propertyId: p.id,
			name: 'Gone',
			maxGuests: 2,
			nightlyRateMinor: 1000
		});
		const { request } = await makeBooking(p.id, { roomId: r.id });
		await deleteRoom(r.id);
		const after = await findBookingRequestById(request.id);
		expect(after).toMatchObject({
			roomId: null,
			propertyId: p.id,
			kind: 'booking',
			nightlyRateMinor: 1000,
			estimatedTotalMinor: 3000
		});
	});

	it('deleting a property cascades to its requests and their messages', async () => {
		const p = await makeProperty();
		const { id } = (await makeBooking(p.id, { message: 'hi' })).request;
		await db.delete(property).where(eq(property.id, p.id));
		expect(await findBookingRequestById(id)).toBeUndefined();
		expect(await db.select().from(bookingMessage)).toEqual([]);
	});

	it('deleting the guest account clears guest_user_id but keeps the request', async () => {
		const p = await makeProperty();
		await db.insert(user).values({ id: 'g-9', name: 'G', email: 'g9@example.com' });
		const { id } = (await makeBooking(p.id, { guestUserId: 'g-9' })).request;
		await db.delete(user).where(eq(user.id, 'g-9'));
		expect((await findBookingRequestById(id))?.guestUserId).toBeNull();
	});

	it('loads through the relations', async () => {
		const p = await makeProperty();
		const r = await insertRoom({
			propertyId: p.id,
			name: 'Rel',
			maxGuests: 2,
			nightlyRateMinor: 1
		});
		const { request } = await makeBooking(p.id, { roomId: r.id, message: 'hi' });
		const found = await db.query.bookingRequest.findFirst({
			where: eq(bookingRequest.id, request.id),
			with: { room: true, messages: true, property: true }
		});
		expect(found?.room?.id).toBe(r.id);
		expect(found?.messages).toHaveLength(1);
		const withRequests = await db.query.property.findFirst({
			where: eq(property.id, p.id),
			with: { bookingRequests: true }
		});
		expect(withRequests?.bookingRequests).toHaveLength(1);
	});
});

describe('database CHECKs and constraints (raw inserts)', () => {
	it('rejects bookings missing dates, party or with check_out not after check_in', async () => {
		const p = await makeProperty();
		const bad = [
			{ checkIn: null },
			{ checkOut: null },
			{ checkOut: '2026-07-10' },
			{ checkOut: '2026-07-09' },
			{ adults: null },
			{ adults: 0 },
			{ children: null },
			{ children: -1 }
		];
		for (const o of bad) {
			expect(
				await pgCode(db.insert(bookingRequest).values(rawRow(p.id, o))),
				JSON.stringify(o)
			).toBe(CHECK_VIOLATION);
		}
		expect(await pgCode(db.insert(bookingRequest).values(rawRow(p.id)))).toBeUndefined();
	});

	it('rejects a question with dates, a room, a party or a price', async () => {
		const p = await makeProperty();
		const q = {
			kind: 'question' as const,
			checkIn: null,
			checkOut: null,
			adults: null,
			children: null
		};
		expect(await pgCode(db.insert(bookingRequest).values(rawRow(p.id, q)))).toBeUndefined();
		for (const o of [
			{ checkIn: '2026-07-10' },
			{ checkOut: '2026-07-12' },
			{ adults: 1 },
			{ children: 0 },
			{ nightlyRateMinor: 1, estimatedTotalMinor: 1 }
		]) {
			expect(
				await pgCode(db.insert(bookingRequest).values(rawRow(p.id, { ...q, ...o }))),
				JSON.stringify(o)
			).toBe(CHECK_VIOLATION);
		}
		const r = await insertRoom({ propertyId: p.id, name: 'R', maxGuests: 2, nightlyRateMinor: 1 });
		expect(
			await pgCode(db.insert(bookingRequest).values(rawRow(p.id, { ...q, roomId: r.id })))
		).toBe(CHECK_VIOLATION);
	});

	it('keeps kind and status consistent: questions never expire, bookings never close', async () => {
		const p = await makeProperty();
		expect(await pgCode(db.insert(bookingRequest).values(rawRow(p.id, { status: 'closed' })))).toBe(
			CHECK_VIOLATION
		);
		const q = {
			kind: 'question' as const,
			checkIn: null,
			checkOut: null,
			adults: null,
			children: null
		};
		for (const status of ['accepted', 'declined', 'cancelled', 'expired'] as const) {
			expect(await pgCode(db.insert(bookingRequest).values(rawRow(p.id, { ...q, status })))).toBe(
				CHECK_VIOLATION
			);
		}
	});

	it('enforces guest, email, currency and price rules in the database', async () => {
		const p = await makeProperty();
		const bad = [
			{ guestName: '  ' },
			{ guestEmail: 'Upper@Example.com' },
			{ guestEmail: 'no-at-sign' },
			{ message: '   ' },
			{ currency: 'myr' },
			{ currency: 'MYRR' },
			{ nightlyRateMinor: 5 },
			{ estimatedTotalMinor: 5 },
			{ nightlyRateMinor: -1, estimatedTotalMinor: 0 },
			{ nightlyRateMinor: 1, estimatedTotalMinor: -1 }
		];
		for (const o of bad) {
			expect(
				await pgCode(db.insert(bookingRequest).values(rawRow(p.id, o))),
				JSON.stringify(o)
			).toBe(CHECK_VIOLATION);
		}
		expect(
			await pgCode(
				db.insert(bookingMessage).values({
					bookingRequestId: (await makeBooking(p.id)).request.id,
					sender: 'guest',
					body: ' '
				})
			)
		).toBe(CHECK_VIOLATION);
	});

	it('rejects a cross-property room at the database level too', async () => {
		const a = await makeProperty('A');
		const b = await makeProperty('B');
		const r = await insertRoom({
			propertyId: b.id,
			name: 'Other',
			maxGuests: 2,
			nightlyRateMinor: 1
		});
		expect(await pgCode(db.insert(bookingRequest).values(rawRow(a.id, { roomId: r.id })))).toBe(
			'23503'
		);
	});

	it('keeps references and token hashes unique', async () => {
		const p = await makeProperty();
		const row = rawRow(p.id);
		await db.insert(bookingRequest).values(row);
		expect(
			await pgCode(db.insert(bookingRequest).values(rawRow(p.id, { reference: row.reference })))
		).toBe('23505');
		expect(
			await pgCode(
				db
					.insert(bookingRequest)
					.values(rawRow(p.id, { guestAccessTokenHash: row.guestAccessTokenHash }))
			)
		).toBe('23505');
	});
});
