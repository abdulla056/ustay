import { describe, expect, it } from 'vitest';
import { clampFrames, layoutFor, LAYOUTS, MAX_FRAMES, objectPosition } from './layouts';

describe('gallery layouts', () => {
	it('defines a slot per frame for 3–7 frames', () => {
		for (let n = 3; n <= MAX_FRAMES; n++) expect(layoutFor(n)).toHaveLength(n);
		expect(Object.keys(LAYOUTS)).toHaveLength(5);
	});

	it('has no zoom layout below three frames, and none beyond seven', () => {
		expect(layoutFor(0)).toBeUndefined();
		expect(layoutFor(2)).toBeUndefined();
		expect(layoutFor(12)).toHaveLength(MAX_FRAMES);
	});

	it('clamps to the first seven frames', () => {
		expect(clampFrames([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(clampFrames([1, 2])).toEqual([1, 2]);
	});

	it('turns focal points into a clamped object-position', () => {
		expect(objectPosition({})).toBe('50% 50%');
		expect(objectPosition({ focalX: 0.25, focalY: 1.4 })).toBe('25% 100%');
	});
});
