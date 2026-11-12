/**
 * Booking request repository (UST-18). The only module that talks Drizzle about
 * `booking_request` and `booking_message`. Conventions: `docs/ARCHITECTURE.md` ("Data access /
 * repository layer") and `docs/DATABASE.md`. The executor is the last param.
 *
 * Authorisation is NOT here. Which actor (owner, guest holding the access token, signed-in guest)
 * may call a transition or add a message is the Phase 6 route's job; this module only enforces the
 * data rules and the lifecycle in `./lifecycle`.
 *
 * The guest access token is generated here, only its SHA-256 hex is stored, and the plain token
 * is returned once from `createBookingRequest` / `createQuestion` for the emailed link. Never
 * store or log it.
 */
import { and, asc, desc, eq, getTableColumns, lte, or, type SQL } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { isUuid } from '$lib/server/db/helpers';
import {
	bookingMessage,
	bookingMessageSenders,
	bookingRequest,
	bookingRequestKinds,
	bookingRequestStatuses,
	room,
	user
} from '$lib/server/db/schema';
import { findPropertyById } from '$lib/server/property/property.repo';
import {
	INT4_MAX,
	nonNegativeInt,
	optionalText,
	positiveInt,
	requiredText,
	type ErrorFactory
} from '$lib/server/validate';
import {
	canTransition,
	generateAccessToken,
	generateReference,
	hashAccessToken,
	isAccessTokenShape,
	isCalendarDate,
	nightsBetween,
	REQUEST_TTL_MS,
	todayInZone,
	type RequestKind,
	type RequestStatus
} from './lifecycle';

export { REQUEST_TTL_MS };

/** The guest access token hash never leaves the repository. */
const { guestAccessTokenHash: _hash, ...publicColumns } = getTableColumns(bookingRequest);
void _hash;

export type BookingRequest = Omit<typeof bookingRequest.$inferSelect, 'guestAccessTokenHash'>;
export type BookingMessage = typeof bookingMessage.$inferSelect;
export type MessageSender = (typeof bookingMessageSenders)[number];

/** Longest guest message or thread body accepted. */
export const MAX_MESSAGE_LENGTH = 5000;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 200;
const MAX_PHONE_LENGTH = 50;
const REFERENCE_ATTEMPTS = 5;

/** Thrown for input the types allow but the data model does not. */
export class BookingValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BookingValidationError';
	}
}

/** Thrown when the property is unknown, malformed or not `published`: it takes no requests. */
export class BookingPropertyUnavailableError extends Error {
	constructor(readonly propertyId: string) {
		super(`Property ${propertyId} is not accepting requests`);
		this.name = 'BookingPropertyUnavailableError';
	}
}

/** Thrown when the room does not exist or belongs to another property. */
export class BookingRoomError extends Error {
	constructor(
		readonly roomId: string,
		readonly propertyId: string
	) {
		super(`Room ${roomId} does not belong to property ${propertyId}`);
		this.name = 'BookingRoomError';
	}
}

/** Thrown for an unknown or malformed request id. */
export class BookingRequestNotFoundError extends Error {
	constructor(readonly requestId: string) {
		super(`Booking request ${requestId} not found`);
		this.name = 'BookingRequestNotFoundError';
	}
}

/** Thrown for a status move the lifecycle does not allow. */
export class BookingTransitionError extends Error {
	constructor(
		readonly kind: RequestKind,
		readonly from: RequestStatus,
		readonly to: RequestStatus
	) {
		super(`A ${kind} cannot move from ${from} to ${to}`);
		this.name = 'BookingTransitionError';
	}
}

const fail: ErrorFactory = (m) => new BookingValidationError(m);

/** Printable ASCII only, so JS and Postgres `lower()` agree and the DB CHECK never trips. */
const EMAIL = /^[\x21-\x7e]+@[\x21-\x7e]+\.[\x21-\x7e]+$/;

/** Trim and lower-case an email, and check its shape. */
export function normaliseEmail(value: unknown): string {
	const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
	if (email.length > MAX_EMAIL_LENGTH || !EMAIL.test(email) || email.split('@').length !== 2) {
		throw new BookingValidationError('guestEmail must be a valid email address');
	}
	return email;
}

function boundedText(value: unknown, field: string, max: number): string {
	const text = requiredText(value, field, fail);
	if (text.length > max)
		throw new BookingValidationError(`${field} must be at most ${max} characters`);
	return text;
}

function optionalBoundedText(value: unknown, field: string, max: number): string | null {
	const text = optionalText(value ?? null, field, fail);
	if (text !== null && text.length > max) {
		throw new BookingValidationError(`${field} must be at most ${max} characters`);
	}
	return text;
}

/** Fields every request carries, whatever its kind. */
export type GuestInput = {
	propertyId: string;
	guestName: string;
	guestEmail: string;
	guestPhone?: string | null;
	/** The optional guest account (decision #4); must be an existing user. */
	guestUserId?: string | null;
	/** The guest's opening note; stored on the request and as the first `guest` message. */
	message?: string | null;
	/** Test seam: the clock used for "not in the past" and the expiry. */
	now?: Date;
};

export type NewBookingRequestInput = GuestInput & {
	roomId?: string | null;
	/** `YYYY-MM-DD` in the property's timezone. */
	checkIn: string;
	checkOut: string;
	adults: number;
	children?: number;
};

export type NewQuestionInput = GuestInput;

export type CreatedRequest = {
	request: BookingRequest;
	/** The plain guest access token. Returned once; only its hash is stored. */
	accessToken: string;
};

/** Validate the guest block and read the property: shared by bookings and questions. */
async function prepareGuest(input: GuestInput, tx: Executor) {
	const raw = input as Record<string, unknown>;
	const property = await findPropertyById(String(raw.propertyId), tx, { lock: true });
	if (!property || property.status !== 'published') {
		throw new BookingPropertyUnavailableError(String(raw.propertyId));
	}
	const guestUserId = raw.guestUserId ?? null;
	if (guestUserId !== null) {
		if (typeof guestUserId !== 'string' || !(await userExists(guestUserId, tx))) {
			throw new BookingValidationError('guestUserId must be an existing user');
		}
	}
	const now = raw.now instanceof Date && !Number.isNaN(raw.now.getTime()) ? raw.now : new Date();
	return {
		property,
		now,
		guest: {
			guestName: boundedText(raw.guestName, 'guestName', MAX_NAME_LENGTH),
			guestEmail: normaliseEmail(raw.guestEmail),
			guestPhone: optionalBoundedText(raw.guestPhone, 'guestPhone', MAX_PHONE_LENGTH),
			guestUserId: guestUserId as string | null,
			message: optionalBoundedText(raw.message, 'message', MAX_MESSAGE_LENGTH)
		}
	};
}

async function userExists(userId: string, tx: Executor): Promise<boolean> {
	const [row] = await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
	return row !== undefined;
}

/**
 * Insert the request with a unique reference (retrying on a collision), its hashed token and
 * its opening `guest` message.
 */
async function insertRequest(
	values: Omit<
		typeof bookingRequest.$inferInsert,
		'reference' | 'guestAccessTokenHash' | 'expiresAt'
	>,
	now: Date,
	tx: Executor
): Promise<CreatedRequest> {
	const accessToken = generateAccessToken();
	const guestAccessTokenHash = await hashAccessToken(accessToken);
	const expiresAt = new Date(now.getTime() + REQUEST_TTL_MS);
	for (let attempt = 0; attempt < REFERENCE_ATTEMPTS; attempt += 1) {
		const [row] = await tx
			.insert(bookingRequest)
			.values({ ...values, reference: generateReference(), guestAccessTokenHash, expiresAt })
			.onConflictDoNothing({ target: bookingRequest.reference })
			.returning(publicColumns);
		if (!row) continue;
		if (row.message !== null) {
			await tx.insert(bookingMessage).values({
				bookingRequestId: row.id,
				sender: 'guest',
				authorUserId: row.guestUserId,
				body: row.message
			});
		}
		return { request: row, accessToken };
	}
	throw new Error('Could not generate a unique booking reference');
}

/**
 * Create a `booking` request, optionally for one room. The property must be `published`, the room
 * must belong to it, the dates must be valid with `checkIn` not before today in the property's
 * timezone, and `adults >= 1`. With a room the price is snapshotted: the room's current nightly
 * rate and `rate x nights` (exact integer minor units, no rounding). Requests do not block dates;
 * the owner decides. Throws {@link BookingPropertyUnavailableError}, {@link BookingRoomError} or
 * {@link BookingValidationError}.
 */
export async function createBookingRequest(
	input: NewBookingRequestInput,
	tx: Executor = db
): Promise<CreatedRequest> {
	return tx.transaction(async (inner) => {
		const raw = input as Record<string, unknown>;
		const { property, now, guest } = await prepareGuest(input, inner);

		if (!isCalendarDate(raw.checkIn) || !isCalendarDate(raw.checkOut)) {
			throw new BookingValidationError('checkIn and checkOut must be YYYY-MM-DD dates');
		}
		const checkIn = raw.checkIn;
		const checkOut = raw.checkOut;
		if (checkOut <= checkIn) {
			throw new BookingValidationError('checkOut must be after checkIn');
		}
		if (checkIn < todayInZone(property.timezone, now)) {
			throw new BookingValidationError(
				"checkIn must not be in the past in the property's timezone"
			);
		}
		const adults = positiveInt(raw.adults, 'adults', fail);
		const children =
			raw.children === undefined ? 0 : nonNegativeInt(raw.children, 'children', fail);

		let roomId: string | null = null;
		let nightlyRateMinor: number | null = null;
		let estimatedTotalMinor: number | null = null;
		if (raw.roomId !== undefined && raw.roomId !== null) {
			const wanted = String(raw.roomId);
			const [found] = isUuid(wanted)
				? await inner
						.select({ id: room.id, nightlyRateMinor: room.nightlyRateMinor })
						.from(room)
						.where(and(eq(room.id, wanted), eq(room.propertyId, property.id)))
						.limit(1)
				: [];
			if (!found) throw new BookingRoomError(wanted, property.id);
			roomId = found.id;
			nightlyRateMinor = found.nightlyRateMinor;
			estimatedTotalMinor = nightlyRateMinor * nightsBetween(checkIn, checkOut);
			if (!Number.isSafeInteger(estimatedTotalMinor) || estimatedTotalMinor > INT4_MAX) {
				throw new BookingValidationError('The stay is too long to price');
			}
		}

		return insertRequest(
			{
				propertyId: property.id,
				kind: 'booking',
				roomId,
				checkIn,
				checkOut,
				adults,
				children,
				...guest,
				currency: property.currency,
				nightlyRateMinor,
				estimatedTotalMinor
			},
			now,
			inner
		);
	});
}

/** Create a general enquiry: no dates, no room, no price. Same rules and return as a booking. */
export async function createQuestion(
	input: NewQuestionInput,
	tx: Executor = db
): Promise<CreatedRequest> {
	return tx.transaction(async (inner) => {
		const { property, now, guest } = await prepareGuest(input, inner);
		return insertRequest(
			{ propertyId: property.id, kind: 'question', ...guest, currency: property.currency },
			now,
			inner
		);
	});
}

/** `undefined` for an unknown or malformed id. */
export async function findBookingRequestById(
	requestId: string,
	tx: Executor = db
): Promise<BookingRequest | undefined> {
	if (!isUuid(requestId)) return undefined;
	const [row] = await tx
		.select(publicColumns)
		.from(bookingRequest)
		.where(eq(bookingRequest.id, requestId))
		.limit(1);
	return row;
}

/** Case-insensitive on the code (`ust-7k3p9q` finds `UST-7K3P9Q`). */
export async function findBookingRequestByReference(
	reference: string,
	tx: Executor = db
): Promise<BookingRequest | undefined> {
	if (typeof reference !== 'string' || reference.length > 32) return undefined;
	const [row] = await tx
		.select(publicColumns)
		.from(bookingRequest)
		.where(eq(bookingRequest.reference, reference.trim().toUpperCase()))
		.limit(1);
	return row;
}

/** Hash the token, then look it up. `undefined` for an unknown or malformed token. */
export async function findBookingRequestByAccessToken(
	token: string,
	tx: Executor = db
): Promise<BookingRequest | undefined> {
	if (!isAccessTokenShape(token)) return undefined;
	const [row] = await tx
		.select(publicColumns)
		.from(bookingRequest)
		.where(eq(bookingRequest.guestAccessTokenHash, await hashAccessToken(token)))
		.limit(1);
	return row;
}

/** The owner's inbox for a property: newest first, optionally narrowed by status and kind. */
export async function listBookingRequests(
	propertyId: string,
	filter: { status?: RequestStatus; kind?: RequestKind } = {},
	tx: Executor = db
): Promise<BookingRequest[]> {
	if (!isUuid(propertyId)) return [];
	const conditions: SQL[] = [eq(bookingRequest.propertyId, propertyId)];
	if (filter.status !== undefined) {
		if (!bookingRequestStatuses.includes(filter.status)) {
			throw new BookingValidationError('status is not a booking request status');
		}
		conditions.push(eq(bookingRequest.status, filter.status));
	}
	if (filter.kind !== undefined) {
		if (!bookingRequestKinds.includes(filter.kind)) {
			throw new BookingValidationError('kind is not a booking request kind');
		}
		conditions.push(eq(bookingRequest.kind, filter.kind));
	}
	return tx
		.select(publicColumns)
		.from(bookingRequest)
		.where(and(...conditions))
		.orderBy(desc(bookingRequest.createdAt), desc(bookingRequest.id));
}

/**
 * A guest's history across properties, by email and/or account, newest first. With neither it
 * returns nothing. The caller must have proved the guest owns the email or the account.
 */
export async function listGuestRequests(
	who: { email?: string; userId?: string },
	tx: Executor = db
): Promise<BookingRequest[]> {
	const matches: SQL[] = [];
	if (who.email !== undefined)
		matches.push(eq(bookingRequest.guestEmail, normaliseEmail(who.email)));
	if (who.userId !== undefined && isUuidLike(who.userId)) {
		matches.push(eq(bookingRequest.guestUserId, who.userId));
	}
	if (matches.length === 0) return [];
	return tx
		.select(publicColumns)
		.from(bookingRequest)
		.where(or(...matches))
		.orderBy(desc(bookingRequest.createdAt), desc(bookingRequest.id));
}

/** Auth user ids are better-auth text, not uuids: only check it is a sane string. */
const isUuidLike = (value: unknown): value is string =>
	typeof value === 'string' && value.length > 0 && value.length <= 128;

/** The system message each transition appends. */
const SYSTEM_MESSAGE: Partial<Record<RequestStatus, string>> = {
	accepted: 'Request accepted',
	declined: 'Request declined',
	cancelled: 'Request cancelled',
	expired: 'Request expired without a reply',
	closed: 'Question closed'
};

/**
 * Move a request to `to`: lock the row, check the lifecycle, stamp `responded_at` /
 * `cancelled_at`, and append the system message, all in one transaction.
 */
async function transition(
	requestId: string,
	to: RequestStatus,
	tx: Executor
): Promise<BookingRequest> {
	if (!isUuid(requestId)) throw new BookingRequestNotFoundError(String(requestId));
	return tx.transaction(async (inner) => {
		const [current] = await inner
			.select({ id: bookingRequest.id, kind: bookingRequest.kind, status: bookingRequest.status })
			.from(bookingRequest)
			.where(eq(bookingRequest.id, requestId))
			.for('update')
			.limit(1);
		if (!current) throw new BookingRequestNotFoundError(requestId);
		if (!canTransition(current.kind, current.status, to)) {
			throw new BookingTransitionError(current.kind, current.status, to);
		}
		const at = new Date();
		const [row] = await inner
			.update(bookingRequest)
			.set({
				status: to,
				...(to === 'accepted' || to === 'declined' ? { respondedAt: at } : {}),
				...(to === 'cancelled' ? { cancelledAt: at } : {})
			})
			.where(eq(bookingRequest.id, requestId))
			.returning(publicColumns);
		await inner
			.insert(bookingMessage)
			.values({ bookingRequestId: requestId, sender: 'system', body: SYSTEM_MESSAGE[to]! });
		return row;
	});
}

/** pending -> accepted (booking). Throws {@link BookingTransitionError} otherwise. */
export const acceptRequest = (requestId: string, tx: Executor = db) =>
	transition(requestId, 'accepted', tx);

/** pending -> declined (booking). */
export const declineRequest = (requestId: string, tx: Executor = db) =>
	transition(requestId, 'declined', tx);

/** pending or accepted -> cancelled (booking). */
export const cancelRequest = (requestId: string, tx: Executor = db) =>
	transition(requestId, 'cancelled', tx);

/** pending -> closed (question). */
export const closeQuestion = (requestId: string, tx: Executor = db) =>
	transition(requestId, 'closed', tx);

/**
 * Expire every `pending` booking whose `expires_at` has passed, in one UPDATE, and append a system
 * message to each in the same transaction. Returns the expired ids. Questions never expire.
 */
export async function expireStaleRequests(now = new Date(), tx: Executor = db): Promise<string[]> {
	return tx.transaction(async (inner) => {
		const rows = await inner
			.update(bookingRequest)
			.set({ status: 'expired' })
			.where(
				and(
					eq(bookingRequest.status, 'pending'),
					eq(bookingRequest.kind, 'booking'),
					lte(bookingRequest.expiresAt, now)
				)
			)
			.returning({ id: bookingRequest.id });
		if (rows.length > 0) {
			await inner.insert(bookingMessage).values(
				rows.map((r) => ({
					bookingRequestId: r.id,
					sender: 'system' as const,
					body: SYSTEM_MESSAGE.expired!
				}))
			);
		}
		return rows.map((r) => r.id);
	});
}

/**
 * Append a message to a request's thread. Messages are append-only. Throws
 * {@link BookingRequestNotFoundError} or {@link BookingValidationError}. Whether `sender` is
 * entitled to post is the route's job.
 */
export async function addMessage(
	requestId: string,
	input: { sender: MessageSender; authorUserId?: string | null; body: string },
	tx: Executor = db
): Promise<BookingMessage> {
	const raw = input as Record<string, unknown>;
	if (!bookingMessageSenders.includes(raw.sender as MessageSender)) {
		throw new BookingValidationError('sender must be guest, host or system');
	}
	const body = boundedText(raw.body, 'body', MAX_MESSAGE_LENGTH);
	return tx.transaction(async (inner) => {
		if (!(await findBookingRequestById(requestId, inner))) {
			throw new BookingRequestNotFoundError(String(requestId));
		}
		const authorUserId = raw.authorUserId ?? null;
		if (authorUserId !== null) {
			if (typeof authorUserId !== 'string' || !(await userExists(authorUserId, inner))) {
				throw new BookingValidationError('authorUserId must be an existing user');
			}
		}
		const [row] = await inner
			.insert(bookingMessage)
			.values({
				bookingRequestId: requestId,
				sender: raw.sender as MessageSender,
				authorUserId: authorUserId as string | null,
				body
			})
			.returning();
		return row;
	});
}

/** A request's thread, oldest first. Empty for an unknown or malformed id. */
export async function listMessages(
	requestId: string,
	tx: Executor = db
): Promise<BookingMessage[]> {
	if (!isUuid(requestId)) return [];
	return tx
		.select()
		.from(bookingMessage)
		.where(eq(bookingMessage.bookingRequestId, requestId))
		.orderBy(asc(bookingMessage.createdAt), asc(bookingMessage.id));
}
