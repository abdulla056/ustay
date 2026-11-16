/**
 * Pure booking-request rules (UST-18): the status transition table, the reference code and the
 * guest access token. No database and no `$env` import, so all of it is unit tested in the
 * default gate.
 *
 * Who may perform a transition (the owner or the guest) is the Phase 6 route's job, not the
 * repository's: these rules say only which moves exist.
 */
import type { bookingRequestKinds, bookingRequestStatuses } from '$lib/server/db/booking.schema';

export type RequestKind = (typeof bookingRequestKinds)[number];
export type RequestStatus = (typeof bookingRequestStatuses)[number];

/** How long a pending request waits for the owner: created + 72 hours. */
export const REQUEST_TTL_MS = 72 * 60 * 60 * 1000;

/** Allowed moves per kind. A status with no entry (or an empty list) is terminal. */
export const TRANSITIONS: Record<RequestKind, Partial<Record<RequestStatus, RequestStatus[]>>> = {
	booking: {
		pending: ['accepted', 'declined', 'cancelled', 'expired'],
		accepted: ['cancelled']
	},
	question: {
		pending: ['closed']
	}
};

export function canTransition(kind: RequestKind, from: RequestStatus, to: RequestStatus): boolean {
	return TRANSITIONS[kind]?.[from]?.includes(to) ?? false;
}

/** No `0`, `O`, `1` or `I`. 32 symbols, so one random byte masked with 31 has no modulo bias. */
export const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const REFERENCE_LENGTH = 6;
export const REFERENCE_PREFIX = 'UST-';

/** A short human code such as `UST-7K3P9Q`. Uniqueness is the caller's job (retry on collision). */
export function generateReference(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(REFERENCE_LENGTH));
	let code = '';
	for (const byte of bytes) code += REFERENCE_ALPHABET[byte & 31];
	return REFERENCE_PREFIX + code;
}

/** Random bytes in a guest access token. */
export const ACCESS_TOKEN_BYTES = 32;

/** A fresh unguessable token, base64url (43 characters). Never store or log it: store its hash. */
export function generateAccessToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(ACCESS_TOKEN_BYTES));
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

/** Whether `value` could be a token from {@link generateAccessToken}; cheap reject before hashing. */
export function isAccessTokenShape(value: unknown): value is string {
	return typeof value === 'string' && /^[A-Za-z0-9_-]{43,128}$/.test(value);
}

/** SHA-256 hex of a token: the only form that is stored. */
export async function hashAccessToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Milliseconds (UTC midnight) of a strict `YYYY-MM-DD` calendar date, or `undefined`. */
function calendarDateMs(value: unknown): number | undefined {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
	const ms = Date.parse(`${value}T00:00:00Z`);
	// Round-trip rejects dates the parser rolls over, such as 2026-02-30.
	return Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== value ? undefined : ms;
}

export const isCalendarDate = (value: unknown): value is string =>
	calendarDateMs(value) !== undefined;

/** Whole nights from `checkIn` to `checkOut`, both valid `YYYY-MM-DD` dates. */
export function nightsBetween(checkIn: string, checkOut: string): number {
	return Math.round((calendarDateMs(checkOut)! - calendarDateMs(checkIn)!) / 86_400_000);
}

/** Today's calendar date (`YYYY-MM-DD`) in an IANA timezone, not the server's. */
export function todayInZone(timeZone: string, now: Date): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(now);
}
