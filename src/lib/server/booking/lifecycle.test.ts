import { describe, expect, it } from 'vitest';
import { bookingRequestStatuses } from '$lib/server/db/booking.schema';
import {
	ACCESS_TOKEN_BYTES,
	canTransition,
	generateAccessToken,
	generateReference,
	hashAccessToken,
	isAccessTokenShape,
	isCalendarDate,
	nightsBetween,
	REFERENCE_ALPHABET,
	REFERENCE_LENGTH,
	REQUEST_TTL_MS,
	todayInZone,
	type RequestKind,
	type RequestStatus
} from './lifecycle';

const ALLOWED: [RequestKind, RequestStatus, RequestStatus][] = [
	['booking', 'pending', 'accepted'],
	['booking', 'pending', 'declined'],
	['booking', 'pending', 'cancelled'],
	['booking', 'pending', 'expired'],
	['booking', 'accepted', 'cancelled'],
	['question', 'pending', 'closed']
];

describe('transition table', () => {
	it('allows exactly the agreed moves and nothing else', () => {
		const allowed = new Set(ALLOWED.map((t) => t.join('>')));
		for (const kind of ['booking', 'question'] as const) {
			for (const from of bookingRequestStatuses) {
				for (const to of bookingRequestStatuses) {
					expect(canTransition(kind, from, to), `${kind} ${from}>${to}`).toBe(
						allowed.has(`${kind}>${from}>${to}`)
					);
				}
			}
		}
	});
});

describe('reference generator', () => {
	it('has no 0, O, 1 or I in its alphabet, and 32 symbols', () => {
		expect(REFERENCE_ALPHABET).not.toMatch(/[01OI]/);
		expect(REFERENCE_ALPHABET).toHaveLength(32);
	});

	it('makes UST- plus six symbols from the alphabet', () => {
		for (let i = 0; i < 500; i += 1) {
			const ref = generateReference();
			expect(ref).toMatch(new RegExp(`^UST-[${REFERENCE_ALPHABET}]{${REFERENCE_LENGTH}}$`));
		}
		expect(new Set(Array.from({ length: 200 }, generateReference)).size).toBeGreaterThan(195);
	});
});

describe('access token', () => {
	it('carries at least 32 bytes of entropy, in url-safe characters', () => {
		expect(ACCESS_TOKEN_BYTES).toBeGreaterThanOrEqual(32);
		const token = generateAccessToken();
		expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(isAccessTokenShape(token)).toBe(true);
		expect(generateAccessToken()).not.toBe(token);
	});

	it('hashes to a stable SHA-256 hex that is not the token', async () => {
		const hash = await hashAccessToken('abc');
		expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
	});

	it('rejects shapes that cannot be a token', () => {
		for (const bad of ['', 'short', 'has space ' + 'a'.repeat(50), 42, null, undefined]) {
			expect(isAccessTokenShape(bad)).toBe(false);
		}
	});
});

describe('calendar dates', () => {
	it('accepts real dates and rejects rolled-over or malformed ones', () => {
		expect(isCalendarDate('2026-02-28')).toBe(true);
		expect(isCalendarDate('2028-02-29')).toBe(true);
		for (const bad of ['2026-02-30', '2026-13-01', '2026-1-1', '', 20260101, null]) {
			expect(isCalendarDate(bad)).toBe(false);
		}
	});

	it('counts nights across month and DST boundaries', () => {
		expect(nightsBetween('2026-03-30', '2026-04-02')).toBe(3);
		expect(nightsBetween('2026-10-24', '2026-11-02')).toBe(9);
	});

	it("reads today in the property's timezone", () => {
		const now = new Date('2026-06-01T20:00:00Z');
		expect(todayInZone('UTC', now)).toBe('2026-06-01');
		expect(todayInZone('Asia/Kuala_Lumpur', now)).toBe('2026-06-02');
		expect(todayInZone('America/Los_Angeles', now)).toBe('2026-06-01');
	});
});

describe('expiry', () => {
	it('is 72 hours', () => {
		expect(REQUEST_TTL_MS).toBe(72 * 3600 * 1000);
	});
});
