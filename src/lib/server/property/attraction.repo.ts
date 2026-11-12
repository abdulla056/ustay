/**
 * Attraction repository (UST-16). The only module that talks Drizzle about `attraction`: the
 * host's own local recommendations, per property (not shared between properties).
 * Conventions: `docs/ARCHITECTURE.md` and `docs/DATABASE.md`. The executor is the last param.
 *
 * The image must be an image from the same property's library: checked here (inside the
 * transaction, asset row locked) and again by the composite foreign key in `location.schema.ts`.
 * Writes lock the property row so concurrent reorders and appends serialise.
 */
import { asc, eq, sql } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { isUuid } from '$lib/server/db/helpers';
import { attraction, attractionCategory, travelMode } from '$lib/server/db/schema';
import { assertImageInLibrary, AttractionImageError } from './media.repo';
import { findPropertyById, PropertyNotFoundError } from './property.repo';
import {
	coordinatePair,
	nonNegativeInt,
	optionalText,
	pick,
	positiveInt,
	requiredText,
	type ErrorFactory
} from '$lib/server/validate';

export { AttractionImageError };

export type Attraction = typeof attraction.$inferSelect;
export type AttractionCategory = (typeof attractionCategory.enumValues)[number];
export type TravelMode = (typeof travelMode.enumValues)[number];

/** Input for {@link insertAttraction}. The image goes through {@link setAttractionImage}. */
export type NewAttractionInput = Omit<
	typeof attraction.$inferInsert,
	'id' | 'mediaAssetId' | 'createdAt' | 'updatedAt'
>;

/** Patch for {@link updateAttraction}. An attraction never moves to another property. */
export type AttractionPatch = Partial<Omit<NewAttractionInput, 'propertyId'>>;

/** Thrown for input the types allow but the data model does not. */
export class AttractionValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AttractionValidationError';
	}
}

/** Thrown when an attraction id is malformed or no such attraction exists. */
export class AttractionNotFoundError extends Error {
	constructor(readonly attractionId: string) {
		super(`Attraction ${attractionId} not found`);
		this.name = 'AttractionNotFoundError';
	}
}

/** Thrown when {@link setAttractionOrder} is given ids that are not all attractions of the property. */
export class AttractionOrderError extends Error {
	constructor(
		readonly propertyId: string,
		readonly attractionIds: string[]
	) {
		super(`Attraction(s) ${attractionIds.join(', ')} do not belong to property ${propertyId}`);
		this.name = 'AttractionOrderError';
	}
}

const fail: ErrorFactory = (m) => new AttractionValidationError(m);
const FIELDS = [
	'name',
	'category',
	'hostNote',
	'travelMinutes',
	'travelMode',
	'distanceMeters',
	'url',
	'latitude',
	'longitude',
	'sortOrder'
] as const;

/** Validate and normalise a patch; the pair rules are checked against the row it will produce. */
function cleanInput(input: object, existing?: Attraction) {
	const clean = pick(input, FIELDS);
	if ('name' in clean) clean.name = requiredText(clean.name, 'name', fail);
	if (
		'category' in clean &&
		!(attractionCategory.enumValues as string[]).includes(clean.category as string)
	) {
		throw fail(`category must be one of ${attractionCategory.enumValues.join(', ')}`);
	}
	for (const key of ['hostNote', 'url'] as const) {
		if (key in clean) clean[key] = optionalText(clean[key], key, fail);
	}
	if (typeof clean.url === 'string' && !/^https?:\/\//.test(clean.url)) {
		throw fail('url must start with http:// or https://');
	}
	for (const key of ['travelMinutes', 'distanceMeters'] as const) {
		if (key in clean && clean[key] !== null) positiveInt(clean[key], key, fail);
	}
	if (
		clean.travelMode != null &&
		!(travelMode.enumValues as string[]).includes(clean.travelMode as string)
	) {
		throw fail(`travelMode must be one of ${travelMode.enumValues.join(', ')}`);
	}
	if ('sortOrder' in clean) nonNegativeInt(clean.sortOrder, 'sortOrder', fail);
	if ('travelMinutes' in clean || 'travelMode' in clean) {
		const minutes =
			'travelMinutes' in clean ? clean.travelMinutes : (existing?.travelMinutes ?? null);
		const mode = 'travelMode' in clean ? clean.travelMode : (existing?.travelMode ?? null);
		if ((minutes === null) !== (mode === null)) {
			throw fail('travelMinutes and travelMode must be set together');
		}
	}
	if ('latitude' in clean || 'longitude' in clean) {
		const lat = 'latitude' in clean ? clean.latitude : (existing?.latitude ?? null);
		const lng = 'longitude' in clean ? clean.longitude : (existing?.longitude ?? null);
		coordinatePair(lat, lng, fail);
	}
	return clean as AttractionPatch;
}

/** The property's attractions, in order. */
export async function listAttractions(propertyId: string, tx: Executor = db) {
	if (!isUuid(propertyId)) return [];
	return tx
		.select()
		.from(attraction)
		.where(eq(attraction.propertyId, propertyId))
		.orderBy(asc(attraction.sortOrder), asc(attraction.createdAt), asc(attraction.id));
}

/** `undefined` for an unknown or malformed id. */
export async function findAttractionById(id: string, tx: Executor = db) {
	if (!isUuid(id)) return undefined;
	const [row] = await tx.select().from(attraction).where(eq(attraction.id, id)).limit(1);
	return row;
}

/**
 * Add an attraction to the property. Without a `sortOrder` it goes last. Throws
 * {@link PropertyNotFoundError} or {@link AttractionValidationError}.
 */
export async function insertAttraction(input: NewAttractionInput, tx: Executor = db) {
	return tx.transaction(async (inner) => {
		const propertyId = (input as { propertyId?: string }).propertyId as string;
		if (!(await findPropertyById(propertyId, inner, { lock: true }))) {
			throw new PropertyNotFoundError(String(propertyId));
		}
		const clean = cleanInput(input);
		if (clean.name === undefined || clean.category === undefined) {
			throw fail('name and category are required');
		}
		if (clean.sortOrder === undefined) {
			const [{ next }] = await inner
				.select({ next: sql<number>`coalesce(max(${attraction.sortOrder}) + 1, 0)::int` })
				.from(attraction)
				.where(eq(attraction.propertyId, propertyId));
			clean.sortOrder = next;
		}
		const [row] = await inner
			.insert(attraction)
			.values({ ...clean, name: clean.name, category: clean.category, propertyId })
			.returning();
		return row;
	});
}

/**
 * `undefined` if the attraction does not exist. `undefined` fields, `id`, `propertyId` and the
 * image are ignored; `null` clears optional fields (travel minutes and mode, and the coordinate
 * pair, are cleared together). Nothing left returns the current row.
 */
export async function updateAttraction(id: string, patch: AttractionPatch, tx: Executor = db) {
	if (!isUuid(id)) return undefined;
	return tx.transaction(async (inner) => {
		if (!(await lockOwner(id, inner))) return undefined;
		const [current] = await inner
			.select()
			.from(attraction)
			.where(eq(attraction.id, id))
			.limit(1)
			.for('update');
		if (!current) return undefined;
		const clean = cleanInput(patch, current);
		if (Object.keys(clean).length === 0) return current;
		const [row] = await inner
			.update(attraction)
			.set(clean)
			.where(eq(attraction.id, id))
			.returning();
		return row;
	});
}

/** Delete an attraction. `undefined` if there was none (or the id is malformed). */
export async function deleteAttraction(id: string, tx: Executor = db) {
	if (!isUuid(id)) return undefined;
	return tx.transaction(async (inner) => {
		if (!(await lockOwner(id, inner))) return undefined;
		const [row] = await inner.delete(attraction).where(eq(attraction.id, id)).returning();
		return row;
	});
}

/**
 * Lock the property that owns attraction `id` (property first, always, so every writer takes
 * locks in the same order). `false` if the attraction or its property is gone.
 */
async function lockOwner(id: string, tx: Executor): Promise<boolean> {
	const [owner] = await tx
		.select({ propertyId: attraction.propertyId })
		.from(attraction)
		.where(eq(attraction.id, id))
		.limit(1);
	return (
		owner !== undefined &&
		(await findPropertyById(owner.propertyId, tx, { lock: true })) !== undefined
	);
}

/**
 * Reorder: the listed attractions take positions `0..n-1` in the order given (duplicates collapse
 * to their first position); any not listed follow, in their current order. Locks the property and
 * writes every position in one statement. Throws {@link PropertyNotFoundError}, or
 * {@link AttractionOrderError} (changing nothing) if an id is not an attraction of this property.
 */
export async function setAttractionOrder(propertyId: string, ids: string[], tx: Executor = db) {
	const ordered = [...new Set(ids)];
	return tx.transaction(async (inner) => {
		if (!(await findPropertyById(propertyId, inner, { lock: true }))) {
			throw new PropertyNotFoundError(String(propertyId));
		}
		const current = await listAttractions(propertyId, inner);
		const known = new Set(current.map((a) => a.id));
		const foreign = ordered.filter((id) => !known.has(id));
		if (foreign.length > 0) throw new AttractionOrderError(propertyId, foreign);
		const listed = new Set(ordered);
		const finalOrder = [...ordered, ...current.map((a) => a.id).filter((id) => !listed.has(id))];
		if (finalOrder.length > 0) {
			const idArray = sql`ARRAY[${sql.join(
				finalOrder.map((id) => sql`${id}::uuid`),
				sql`, `
			)}]::uuid[]`;
			await inner.execute(
				sql`UPDATE attraction AS a SET sort_order = v.pos - 1, updated_at = now()
					FROM unnest(${idArray}) WITH ORDINALITY AS v(id, pos)
					WHERE a.id = v.id AND a.property_id = ${propertyId}`
			);
		}
		return listAttractions(propertyId, inner);
	});
}

/**
 * Set the attraction's image to an image in the property's library, or clear it with `null`.
 * Throws {@link AttractionNotFoundError}, `MediaNotInLibraryError` for an asset outside the
 * library, {@link AttractionImageError} for a non-image.
 */
export async function setAttractionImage(
	attractionId: string,
	assetId: string | null,
	tx: Executor = db
) {
	return tx.transaction(async (inner) => {
		const [owner] = isUuid(attractionId)
			? await inner
					.select({ propertyId: attraction.propertyId })
					.from(attraction)
					.where(eq(attraction.id, attractionId))
					.limit(1)
			: [];
		if (!owner) throw new AttractionNotFoundError(String(attractionId));
		await findPropertyById(owner.propertyId, inner, { lock: true });
		if (assetId !== null) {
			await assertImageInLibrary(
				owner.propertyId,
				assetId,
				inner,
				(id) => new AttractionImageError(id, `Attraction image ${id} must be an image asset`)
			);
		}
		const [row] = await inner
			.update(attraction)
			.set({ mediaAssetId: assetId })
			.where(eq(attraction.id, attractionId))
			.returning();
		if (!row) throw new AttractionNotFoundError(attractionId);
		return row;
	});
}
