import { describe, expect, it } from 'vitest';
import { formatMoney } from './format';

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
