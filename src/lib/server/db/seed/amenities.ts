/**
 * Seed module: the standard amenity catalogue (UST-13). Idempotent: rows are upserted by `key`,
 * so re-running `db:seed` changes nothing.
 *
 * Runs under plain `bun`, so it must not import repositories (they pull `$env` via
 * `$lib/server/db`). It writes through the Drizzle query builder on `ctx.db`.
 */
import { sql } from 'drizzle-orm';
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

export async function seedAmenities(db: SeedDb): Promise<SeedModuleResult> {
	await db
		.insert(amenity)
		.values(STANDARD_AMENITIES)
		.onConflictDoUpdate({
			target: amenity.key,
			set: {
				name: sql`excluded.name`,
				category: sql`excluded.category`,
				icon: sql`excluded.icon`,
				sortOrder: sql`excluded.sort_order`
			}
		});

	return {
		created: true,
		detail: `${STANDARD_AMENITIES.length} amenities upserted`
	};
}
