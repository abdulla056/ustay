import { describe, expect, it } from 'vitest';
import { APPROX_RADIUS_METERS, circleRing, travelLabel } from './geo';

const haversine = (a: [number, number], lat: number, lng: number) => {
	const r = Math.PI / 180;
	const dLat = (a[1] - lat) * r;
	const dLng = (a[0] - lng) * r;
	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(lat * r) * Math.cos(a[1] * r) * Math.sin(dLng / 2) ** 2;
	return 2 * 6_371_008.8 * Math.asin(Math.sqrt(h));
};

describe('circleRing', () => {
	it('is closed and every vertex sits about 1 km from the centre', () => {
		const ring = circleRing(4.418, 101.379);
		expect(ring[0]).toEqual(ring[ring.length - 1]);
		for (const p of ring) {
			expect(Math.abs(haversine(p, 4.418, 101.379) - APPROX_RADIUS_METERS)).toBeLessThan(1);
		}
	});
});

describe('travelLabel', () => {
	it('formats time, distance, both, and neither', () => {
		expect(travelLabel({ travel: { minutes: 12, mode: 'walk' }, distanceMeters: null })).toBe(
			'12 min walk'
		);
		expect(travelLabel({ travel: null, distanceMeters: 6200 })).toBe('6.2 km');
		expect(travelLabel({ travel: null, distanceMeters: 450 })).toBe('450 m');
		expect(travelLabel({ travel: { minutes: 5, mode: 'drive' }, distanceMeters: 2000 })).toBe(
			'5 min drive · 2 km'
		);
		expect(travelLabel({ travel: null, distanceMeters: null })).toBeNull();
	});

	it('words coarsened distances for a hidden house', () => {
		const d = (distanceMeters: number) => travelLabel({ travel: null, distanceMeters }, true);
		expect(d(1000)).toBe('under 1 km');
		expect(d(6000)).toBe('about 6 km');
		expect(d(6500)).toBe('about 6.5 km');
	});
});
