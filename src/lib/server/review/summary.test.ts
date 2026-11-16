import { describe, expect, it } from 'vitest';
import { averageRating } from './summary';

describe('averageRating', () => {
	it('is null for no reviews', () => {
		expect(averageRating(0, 0)).toBeNull();
	});

	it('returns whole averages unchanged', () => {
		expect(averageRating(15, 3)).toBe(5);
		expect(averageRating(12, 3)).toBe(4);
	});

	it('rounds half-up to one decimal', () => {
		expect(averageRating(17, 4)).toBe(4.3); // 4.25
		expect(averageRating(61, 20)).toBe(3.1); // 3.05
		expect(averageRating(13, 3)).toBe(4.3); // 4.333
		expect(averageRating(14, 3)).toBe(4.7); // 4.666
		expect(averageRating(9, 8)).toBe(1.1); // 1.125
		expect(averageRating(41, 20)).toBe(2.1); // 2.05
	});
});
