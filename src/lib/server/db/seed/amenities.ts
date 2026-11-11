/**
 * Seed module: the standard amenity catalogue (UST-13). Idempotent: rows are upserted by `key`,
 * so re-running `db:seed` changes nothing.
 *
 * Runs under plain `bun`, so it must not import repositories (they pull `$env` via
 * `$lib/server/db`). It writes through the Drizzle query builder on `ctx.db`.
 */
import { amenity, amenityCategory } from '../amenity.schema';
import type { SeedDb } from './client';
import type { SeedModuleResult } from './dev-user';

type AmenitySeed = {
	key: string;
	name: string;
	category: (typeof amenityCategory.enumValues)[number];
	icon: string;
	sortOrder: number;
};

const byCategory: Record<AmenitySeed['category'], [string, string][]> = {
	essentials: [
		['wifi', 'Wi-Fi'],
		['air-conditioning', 'Air conditioning'],
		['workspace', 'Dedicated workspace'],
		['parking', 'Free parking']
	],
	bathroom: [
		['hot-water', 'Hot water'],
		['toiletries', 'Toiletries'],
		['bathtub', 'Bathtub']
	],
	kitchen: [
		['kitchen', 'Full kitchen'],
		['coffee-maker', 'Coffee maker'],
		['breakfast', 'Breakfast included']
	],
	outdoor: [
		['pool', 'Pool'],
		['garden', 'Garden'],
		['bbq', 'BBQ grill'],
		['balcony', 'Balcony']
	],
	wellness: [
		['spa', 'Spa'],
		['gym', 'Gym'],
		['yoga-deck', 'Yoga deck']
	],
	family: [
		['crib', 'Crib'],
		['high-chair', 'High chair']
	],
	accessibility: [
		['step-free-access', 'Step-free access'],
		['lift', 'Lift']
	],
	services: [
		['airport-transfer', 'Airport transfer'],
		['daily-housekeeping', 'Daily housekeeping'],
		['concierge', 'Concierge']
	]
};

/** The standard set. `icon` equals `key`; `sortOrder` is the index within its category. */
export const STANDARD_AMENITIES: AmenitySeed[] = (
	Object.keys(byCategory) as AmenitySeed['category'][]
).flatMap((category) =>
	byCategory[category].map(([key, name], sortOrder) => ({
		key,
		name,
		category,
		icon: key,
		sortOrder
	}))
);

/**
 * Insert the catalogue rows that are missing, matched on `key`. Existing rows are left alone, so
 * a second run changes nothing and staff edits to the catalogue survive a re-seed.
 */
export async function seedAmenities(db: SeedDb): Promise<SeedModuleResult> {
	const inserted = await db
		.insert(amenity)
		.values(STANDARD_AMENITIES)
		.onConflictDoNothing({ target: amenity.key })
		.returning({ id: amenity.id });

	return {
		created: inserted.length > 0,
		detail:
			inserted.length > 0
				? `${inserted.length} amenities inserted`
				: `all ${STANDARD_AMENITIES.length} amenities present`
	};
}
