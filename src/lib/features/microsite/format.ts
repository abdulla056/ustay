/** Shared formatting for microsite sections. Pure and client-safe. */
import type { Money } from './types';

/**
 * Format integer minor units in a currency. The exponent comes from `Intl` (2 for MYR, 0 for JPY,
 * 3 for KWD), so a price is divided by the right power of ten. Whole amounts drop the trailing
 * `.00`. Floats appear only here, at the display edge; money is integers everywhere else.
 */
export function formatMoney({ amountMinor, currency }: Money, locale = 'en-MY'): string {
	const digits =
		new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions()
			.maximumFractionDigits ?? 2;
	const major = amountMinor / 10 ** digits;
	const whole = Number.isInteger(major);
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: whole ? 0 : digits,
		maximumFractionDigits: digits
	}).format(major);
}

/** Local calendar date as `YYYY-MM-DD` (what `<input type="date">` uses). */
export function toIsoDate(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
