/**
 * Small input validators shared by the location, destination and attraction repositories (UST-16).
 * Each throws the error its `fail` factory returns, so callers surface their own typed validation
 * error and never a raw Postgres code.
 */

export type ErrorFactory = (message: string) => Error;

/** The keys of `input` listed in `allowed`, with `undefined` values dropped (runtime strip). */
export function pick(input: object, allowed: readonly string[]): Record<string, unknown> {
	const raw = input as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	for (const key of allowed) if (raw[key] !== undefined) out[key] = raw[key];
	return out;
}

/** A non-blank string, trimmed. */
export function requiredText(value: unknown, field: string, fail: ErrorFactory): string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw fail(`${field} must be a non-blank string`);
	}
	return value.trim();
}

/** A string trimmed, with blank becoming `null`; `null` stays `null`. */
export function optionalText(value: unknown, field: string, fail: ErrorFactory): string | null {
	if (value === null) return null;
	if (typeof value !== 'string') throw fail(`${field} must be a string`);
	return value.trim() === '' ? null : value.trim();
}

/** ISO 3166-1 alpha-2 shape: two letters (input is trimmed and upper-cased). */
export function countryCode(value: unknown, fail: ErrorFactory): string {
	const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
	if (!/^[A-Z]{2}$/.test(code)) throw fail('countryCode must be a two-letter ISO 3166-1 code');
	return code;
}

/** Both coordinates or neither; latitude in -90..90, longitude in -180..180. */
export function coordinatePair(latitude: unknown, longitude: unknown, fail: ErrorFactory) {
	if (latitude === null && longitude === null) return;
	const ok = (v: unknown, limit: number): v is number =>
		typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;
	if (latitude == null || longitude == null) {
		throw fail('latitude and longitude must be set together');
	}
	if (!ok(latitude, 90)) throw fail('latitude must be a number from -90 to 90');
	if (!ok(longitude, 180)) throw fail('longitude must be a number from -180 to 180');
}

/** Largest value a Postgres `integer` (int4) column holds. */
export const INT4_MAX = 2_147_483_647;

/** An integer from `min` to {@link INT4_MAX}, so an oversized value is a typed error, not a pg one. */
function boundedInt(value: unknown, field: string, min: number, fail: ErrorFactory): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > INT4_MAX) {
		throw fail(`${field} must be an integer from ${min} to ${INT4_MAX}`);
	}
	return value;
}

/** A positive integer that fits an int4 column. */
export function positiveInt(value: unknown, field: string, fail: ErrorFactory): number {
	return boundedInt(value, field, 1, fail);
}

/** A non-negative integer that fits an int4 column. */
export function nonNegativeInt(value: unknown, field: string, fail: ErrorFactory): number {
	return boundedInt(value, field, 0, fail);
}
