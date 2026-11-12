/**
 * Location repository (UST-16). The only module that talks Drizzle about `property_location`.
 * Conventions: `docs/ARCHITECTURE.md` ("Data access / repository layer") and `docs/DATABASE.md`.
 * The executor is the last param.
 *
 * The location is 1:1 with a property. Coordinates are plain columns (no PostGIS); the pair and
 * range rules are checked here and again by CHECK constraints.
 */
import { eq } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { isUuid } from '$lib/server/db/helpers';
import { destination, propertyLocation } from '$lib/server/db/schema';
import { DestinationNotFoundError } from '$lib/server/destination/destination.repo';
import { findPropertyById, PropertyNotFoundError } from './property.repo';
import {
	coordinatePair,
	countryCode,
	optionalText,
	pick,
	requiredText,
	type ErrorFactory
} from '$lib/server/validate';

export type PropertyLocation = typeof propertyLocation.$inferSelect;

/** Fields of a location a caller may write. The destination goes through {@link setPropertyDestination}. */
export type PropertyLocationInput = Partial<
	Omit<
		typeof propertyLocation.$inferInsert,
		'propertyId' | 'destinationId' | 'createdAt' | 'updatedAt'
	>
>;

/** Thrown for input the types allow but the data model does not (blank locality, bad country code or coordinates, ...). */
export class LocationValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'LocationValidationError';
	}
}

/** Thrown when a property has no location to modify. */
export class LocationNotFoundError extends Error {
	constructor(readonly propertyId: string) {
		super(`Property ${propertyId} has no location`);
		this.name = 'LocationNotFoundError';
	}
}

const WRITABLE_FIELDS = [
	'addressLine1',
	'addressLine2',
	'locality',
	'region',
	'postalCode',
	'countryCode',
	'latitude',
	'longitude',
	'showExactLocation'
] as const;
const OPTIONAL_TEXT = ['addressLine1', 'addressLine2', 'region', 'postalCode'] as const;
const fail: ErrorFactory = (m) => new LocationValidationError(m);

/**
 * The full location, address included. **Owner/admin only**: never hand this to a public page
 * (decision 8). Public pages use {@link getPublicPropertyLocation}. `undefined` for an unknown or
 * malformed property id.
 */
export async function getPropertyLocation(propertyId: string, tx: Executor = db) {
	if (!isUuid(propertyId)) return undefined;
	const [row] = await tx
		.select()
		.from(propertyLocation)
		.where(eq(propertyLocation.propertyId, propertyId))
		.limit(1);
	return row;
}

/** The location as a public page may see it. */
export type PublicPropertyLocation = Pick<
	PropertyLocation,
	| 'locality'
	| 'region'
	| 'countryCode'
	| 'destinationId'
	| 'latitude'
	| 'longitude'
	| 'showExactLocation'
> &
	Partial<Pick<PropertyLocation, 'addressLine1' | 'addressLine2' | 'postalCode'>>;

/** About 1 km: two decimal places of latitude/longitude. */
const coarsen = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);

/**
 * The read public pages must use (decision 8). With `show_exact_location` off it returns only the
 * locality, region, country, destination and coordinates rounded to two decimals (about 1 km),
 * with no address lines or postal code. With it on, the full location. `undefined` for an unknown
 * or malformed property id or a property without a location.
 */
export async function getPublicPropertyLocation(
	propertyId: string,
	tx: Executor = db
): Promise<PublicPropertyLocation | undefined> {
	const row = await getPropertyLocation(propertyId, tx);
	if (!row) return undefined;
	if (row.showExactLocation) return row;
	return {
		locality: row.locality,
		region: row.region,
		countryCode: row.countryCode,
		destinationId: row.destinationId,
		latitude: coarsen(row.latitude),
		longitude: coarsen(row.longitude),
		showExactLocation: false
	};
}

/** Validate and normalise a patch. A touched coordinate is checked against the row it produces. */
function cleanInput(input: PropertyLocationInput, existing: PropertyLocation | undefined) {
	const clean = pick(input, WRITABLE_FIELDS);
	if ('locality' in clean) clean.locality = requiredText(clean.locality, 'locality', fail);
	if ('countryCode' in clean) clean.countryCode = countryCode(clean.countryCode, fail);
	for (const key of OPTIONAL_TEXT) {
		if (key in clean) clean[key] = optionalText(clean[key], key, fail);
	}
	if ('showExactLocation' in clean && typeof clean.showExactLocation !== 'boolean') {
		throw fail('showExactLocation must be a boolean');
	}
	if ('latitude' in clean || 'longitude' in clean) {
		const lat = 'latitude' in clean ? clean.latitude : (existing?.latitude ?? null);
		const lng = 'longitude' in clean ? clean.longitude : (existing?.longitude ?? null);
		coordinatePair(lat, lng, fail);
	}
	return clean as PropertyLocationInput;
}

/**
 * Create the property's location, or patch the existing one. `undefined` fields, the destination
 * and `propertyId` are ignored; `null` clears optional fields (clear both coordinates together).
 * Text is trimmed, blank optional text becomes null, country codes are upper-cased. Creating needs
 * `locality` and `countryCode`. Throws {@link PropertyNotFoundError} or
 * {@link LocationValidationError}.
 */
export async function upsertPropertyLocation(
	propertyId: string,
	input: PropertyLocationInput,
	tx: Executor = db
) {
	return tx.transaction(async (inner) => {
		if (!(await findPropertyById(propertyId, inner, { lock: true }))) {
			throw new PropertyNotFoundError(propertyId);
		}
		const existing = await getPropertyLocation(propertyId, inner);
		const clean = cleanInput(input, existing);
		if (existing) {
			if (Object.keys(clean).length === 0) return existing;
			const [row] = await inner
				.update(propertyLocation)
				.set(clean)
				.where(eq(propertyLocation.propertyId, propertyId))
				.returning();
			return row;
		}
		if (clean.locality === undefined || clean.countryCode === undefined) {
			throw fail('locality and countryCode are required to create a location');
		}
		const [row] = await inner
			.insert(propertyLocation)
			.values({ ...clean, locality: clean.locality, countryCode: clean.countryCode, propertyId })
			.returning();
		return row;
	});
}

/**
 * Put the property in a destination, or take it out with `null`. Throws
 * {@link PropertyNotFoundError}, {@link DestinationNotFoundError}, or
 * {@link LocationNotFoundError} when the property has no location yet.
 */
export async function setPropertyDestination(
	propertyId: string,
	destinationId: string | null,
	tx: Executor = db
) {
	return tx.transaction(async (inner) => {
		if (!(await findPropertyById(propertyId, inner, { lock: true }))) {
			throw new PropertyNotFoundError(propertyId);
		}
		if (destinationId !== null) {
			const [found] = isUuid(destinationId)
				? await inner
						.select({ id: destination.id })
						.from(destination)
						.where(eq(destination.id, destinationId))
						.limit(1)
						// Blocks a concurrent delete of the destination until we commit.
						.for('key share')
				: [];
			if (!found) throw new DestinationNotFoundError(String(destinationId));
		}
		const [row] = await inner
			.update(propertyLocation)
			.set({ destinationId })
			.where(eq(propertyLocation.propertyId, propertyId))
			.returning();
		if (!row) throw new LocationNotFoundError(propertyId);
		return row;
	});
}

/** Delete the location. `undefined` if there was none (or the id is malformed). */
export async function deletePropertyLocation(propertyId: string, tx: Executor = db) {
	if (!isUuid(propertyId)) return undefined;
	const [row] = await tx
		.delete(propertyLocation)
		.where(eq(propertyLocation.propertyId, propertyId))
		.returning();
	return row;
}
