/** Shared formatting for microsite sections. Pure and client-safe. */
import type { Money, OverviewData, ReviewView } from './types';

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

const TYPE_LABELS: Record<OverviewData['type'], string> = {
	homestay: 'Homestay',
	resort: 'Resort',
	boutique: 'Boutique stay',
	rental: 'Rental'
};

/** Human label for a property type. */
export const typeLabel = (type: OverviewData['type']): string => TYPE_LABELS[type];

/** `1 room`, `3 rooms`. */
export const plural = (n: number, one: string, many: string): string =>
	`${n} ${n === 1 ? one : many}`;

export const QUOTE_MAX = 280;

/**
 * The review to feature as a pull-quote, and the text to show. The first review at or under
 * `QUOTE_MAX` characters wins; otherwise the shortest, cut at a word boundary with an ellipsis.
 * Never a wall of text. Null for no reviews.
 */
export function pickFeaturedQuote(
	items: ReviewView[]
): { index: number; review: ReviewView; text: string } | null {
	if (items.length === 0) return null;
	let index = items.findIndex((r) => r.body.length <= QUOTE_MAX);
	if (index === -1) {
		index = items.reduce((best, r, i) => (r.body.length < items[best].body.length ? i : best), 0);
	}
	const review = items[index];
	if (review.body.length <= QUOTE_MAX) return { index, review, text: review.body };
	const cut = review.body.slice(0, QUOTE_MAX);
	const lastSpace = cut.lastIndexOf(' ');
	const trimmed = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!?-]+$/, '');
	return { index, review, text: `${trimmed}…` };
}

const LANGUAGE_NAMES: Record<string, string> = {
	en: 'English',
	ms: 'Malay',
	zh: 'Chinese',
	ta: 'Tamil',
	hi: 'Hindi',
	ar: 'Arabic',
	fr: 'French',
	de: 'German',
	es: 'Spanish',
	ja: 'Japanese',
	ko: 'Korean',
	id: 'Indonesian',
	th: 'Thai',
	vi: 'Vietnamese',
	it: 'Italian',
	pt: 'Portuguese',
	ru: 'Russian',
	nl: 'Dutch',
	tl: 'Filipino',
	bn: 'Bengali'
};

const LANGUAGE_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/i;

/**
 * A language for display. Only values shaped like a code (`en`, `zh-Hans`) are mapped, from a fixed
 * table so server and client always agree (no `Intl.DisplayNames`). Known codes give their English
 * name, unknown codes show uppercased (`PT`), and free text ("English") passes through unchanged.
 */
export function languageName(value: string): string {
	const trimmed = value.trim();
	if (!LANGUAGE_CODE.test(trimmed)) return trimmed;
	const base = trimmed.split('-')[0].toLowerCase();
	return LANGUAGE_NAMES[base] ?? trimmed.toUpperCase();
}
