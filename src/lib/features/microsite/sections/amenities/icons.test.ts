import { describe, expect, it } from 'vitest';
import { STANDARD_AMENITIES } from '$lib/server/db/seed/amenities';
import { AMENITY_ICONS, FALLBACK_ICON, amenityIcon } from './icons';

describe('amenity icons', () => {
	it('maps every standard amenity icon key', () => {
		expect(STANDARD_AMENITIES.length).toBeGreaterThan(0);
		for (const a of STANDARD_AMENITIES) {
			expect(AMENITY_ICONS[a.icon], `missing icon for "${a.icon}"`).toBeDefined();
		}
	});

	it('falls back for unknown keys, including prototype names', () => {
		expect(amenityIcon('nope')).toBe(FALLBACK_ICON);
		expect(amenityIcon('constructor')).toBe(FALLBACK_ICON);
		expect(amenityIcon('wifi')).toBe(AMENITY_ICONS.wifi);
	});
});
