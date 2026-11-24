/** Pure map helpers for the location section. Client-safe, no maplibre import. */

/**
 * The privacy circle drawn when the exact location is hidden (decision 8): a 1 km radius, so about
 * 2 km across. The stored point is already coarsened to 2 decimals (about 1.1 km at most), so the
 * circle still contains the true location.
 */
export const APPROX_RADIUS_METERS = 1000;

const EARTH_RADIUS_M = 6_371_008.8;

/** A closed GeoJSON ring (lng, lat) approximating a circle of `radiusMeters` around a point. */
export function circleRing(
	latitude: number,
	longitude: number,
	radiusMeters = APPROX_RADIUS_METERS,
	steps = 64
): [number, number][] {
	const lat = (latitude * Math.PI) / 180;
	const lng = (longitude * Math.PI) / 180;
	const d = radiusMeters / EARTH_RADIUS_M;
	const ring: [number, number][] = [];
	for (let i = 0; i < steps; i++) {
		const bearing = (2 * Math.PI * i) / steps;
		const lat2 = Math.asin(
			Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(bearing)
		);
		const lng2 =
			lng +
			Math.atan2(
				Math.sin(bearing) * Math.sin(d) * Math.cos(lat),
				Math.cos(d) - Math.sin(lat) * Math.sin(lat2)
			);
		ring.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
	}
	ring.push(ring[0]);
	return ring;
}

/**
 * "12 min walk", "6.2 km", or null. With `approximate` (a hidden house, distances already
 * coarsened to 500 m with a 1 km floor) distances read "under 1 km" or "about 6 km".
 */
export function travelLabel(
	a: {
		travel: { minutes: number; mode: string } | null;
		distanceMeters: number | null;
	},
	approximate = false
): string | null {
	const parts: string[] = [];
	if (a.travel) parts.push(`${a.travel.minutes} min ${a.travel.mode}`);
	if (a.distanceMeters != null && approximate) {
		const km = (a.distanceMeters / 1000).toFixed(1).replace(/\.0$/, '');
		parts.push(a.distanceMeters <= 1000 ? 'under 1 km' : `about ${km} km`);
	} else if (a.distanceMeters != null) {
		parts.push(
			a.distanceMeters >= 1000
				? `${(a.distanceMeters / 1000).toFixed(1).replace(/\.0$/, '')} km`
				: `${a.distanceMeters} m`
		);
	}
	return parts.length ? parts.join(' · ') : null;
}
