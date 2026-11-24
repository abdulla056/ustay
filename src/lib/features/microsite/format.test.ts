import { describe, expect, it } from 'vitest';
import { formatMoney, languageName, pickFeaturedQuote } from './format';
import type { ReviewView } from './types';

describe('formatMoney', () => {
	it('formats minor units in the currency, dropping .00 for whole amounts', () => {
		expect(formatMoney({ amountMinor: 28000, currency: 'MYR' })).toMatch(/^RM\s?280$/);
	});

	it('keeps cents when the amount is not whole', () => {
		expect(formatMoney({ amountMinor: 28050, currency: 'MYR' })).toMatch(/^RM\s?280\.50$/);
	});

	it('respects a zero-decimal currency', () => {
		expect(formatMoney({ amountMinor: 15000, currency: 'JPY' }, 'en-US')).toBe('¥15,000');
	});

	it('respects a three-decimal currency', () => {
		expect(formatMoney({ amountMinor: 1500, currency: 'KWD' }, 'en-US')).toMatch(/^KWD\s1\.500$/);
	});

	it('formats zero', () => {
		expect(formatMoney({ amountMinor: 0, currency: 'USD' }, 'en-US')).toBe('$0');
	});
});

describe('pickFeaturedQuote', () => {
	const review = (body: string): ReviewView => ({
		rating: 5,
		title: null,
		body,
		authorName: 'A',
		stayedOn: null,
		source: 'guest',
		origin: null,
		hostReply: null
	});

	it('returns null without reviews', () => {
		expect(pickFeaturedQuote([])).toBeNull();
	});

	it('takes the first review at or under 280 characters', () => {
		const q = pickFeaturedQuote([review('x'.repeat(400)), review('Short one.'), review('Other.')]);
		expect(q).toMatchObject({ index: 1, text: 'Short one.' });
	});

	it('truncates the shortest review at a word boundary when all are long', () => {
		const long = (n: number) => 'word '.repeat(n);
		const q = pickFeaturedQuote([review(long(120)), review(long(80))]);
		expect(q?.index).toBe(1);
		expect(q?.text.endsWith('word…')).toBe(true);
		expect(q!.text.length).toBeLessThanOrEqual(281);
	});
});

describe('languageName', () => {
	it('maps known codes and region variants', () => {
		expect(languageName('en')).toBe('English');
		expect(languageName('ms')).toBe('Malay');
		expect(languageName('zh-Hans')).toBe('Chinese');
	});
	it('uppercases unknown codes', () => {
		expect(languageName('xx')).toBe('XX');
		expect(languageName('qaa')).toBe('QAA');
	});
	it('passes free text through unchanged', () => {
		expect(languageName('English')).toBe('English');
		expect(languageName('Bahasa Malaysia')).toBe('Bahasa Malaysia');
	});
});
