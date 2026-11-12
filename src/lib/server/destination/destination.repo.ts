/**
 * Destination repository (UST-16). The only module that talks Drizzle about `destination`.
 * Destinations are platform-curated (not per-owner) and group properties for discovery (Phase 5).
 * Conventions: `docs/ARCHITECTURE.md` and `docs/DATABASE.md`. The executor is the last param.
 */
import { and, asc, eq } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { isUuid } from '$lib/server/db/helpers';
import { destination, property, propertyLocation } from '$lib/server/db/schema';
import { uniqueSlug } from '$lib/server/db/slug';
import {
	countryCode,
	optionalText,
	pick,
	requiredText,
	type ErrorFactory
} from '$lib/server/property/validate';

export type Destination = typeof destination.$inferSelect;

/** Input for {@link createDestination}. A `slug` may pin one, otherwise it comes from the name. */
export type NewDestinationInput = Omit<
	typeof destination.$inferInsert,
	'id' | 'slug' | 'createdAt' | 'updatedAt'
> & { slug?: string };

/** Patch for {@link updateDestination}. The slug is not patchable here (renames need redirects). */
export type DestinationPatch = Partial<Omit<NewDestinationInput, 'slug'>>;

/** Thrown for blank names, bad country codes or wrong-typed fields. */
export class DestinationValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DestinationValidationError';
	}
}

const fail: ErrorFactory = (m) => new DestinationValidationError(m);
const FIELDS = ['name', 'region', 'countryCode', 'summary'] as const;

function clean(input: object) {
	const out = pick(input, FIELDS);
	if ('name' in out) out.name = requiredText(out.name, 'name', fail);
	if ('countryCode' in out) out.countryCode = countryCode(out.countryCode, fail);
	for (const key of ['region', 'summary']) {
		if (key in out) out[key] = optionalText(out[key], key, fail);
	}
	return out;
}

async function isSlugTaken(candidate: string, tx: Executor) {
	const [row] = await tx
		.select({ id: destination.id })
		.from(destination)
		.where(eq(destination.slug, candidate))
		.limit(1);
	return row !== undefined;
}

export async function createDestination(input: NewDestinationInput, tx: Executor = db) {
	const values = clean(input);
	if (values.name === undefined || values.countryCode === undefined) {
		throw fail('name and countryCode are required');
	}
	const name = values.name as string;
	const slug =
		input.slug !== undefined
			? requiredText(input.slug, 'slug', fail)
			: await uniqueSlug(name, (c) => isSlugTaken(c, tx));
	const [row] = await tx
		.insert(destination)
		.values({ ...values, name, countryCode: values.countryCode as string, slug })
		.returning();
	return row;
}

/** `undefined` for an unknown slug. */
export async function findDestinationBySlug(slug: string, tx: Executor = db) {
	if (typeof slug !== 'string') return undefined;
	const [row] = await tx.select().from(destination).where(eq(destination.slug, slug)).limit(1);
	return row;
}

/** `undefined` for an unknown or malformed id. */
export async function findDestinationById(id: string, tx: Executor = db) {
	if (!isUuid(id)) return undefined;
	const [row] = await tx.select().from(destination).where(eq(destination.id, id)).limit(1);
	return row;
}

/** Every destination, by name. */
export async function listDestinations(tx: Executor = db) {
	return tx.select().from(destination).orderBy(asc(destination.name), asc(destination.id));
}

/** `undefined` if the destination does not exist. Undefined fields are ignored; nothing left returns the row. */
export async function updateDestination(id: string, patch: DestinationPatch, tx: Executor = db) {
	if (!isUuid(id)) return undefined;
	const values = clean(patch);
	if (Object.keys(values).length === 0) return findDestinationById(id, tx);
	const [row] = await tx.update(destination).set(values).where(eq(destination.id, id)).returning();
	return row;
}

/** Delete a destination; properties in it keep their location with no destination (set null). */
export async function deleteDestination(id: string, tx: Executor = db) {
	if (!isUuid(id)) return undefined;
	const [row] = await tx.delete(destination).where(eq(destination.id, id)).returning();
	return row;
}

/** The destination's `published` properties only, by name. Drafts and archived are never listed. */
export async function listPublishedPropertiesInDestination(
	destinationId: string,
	tx: Executor = db
) {
	if (!isUuid(destinationId)) return [];
	const rows = await tx
		.select({ property })
		.from(propertyLocation)
		.innerJoin(property, eq(propertyLocation.propertyId, property.id))
		.where(and(eq(propertyLocation.destinationId, destinationId), eq(property.status, 'published')))
		.orderBy(asc(property.name), asc(property.id));
	return rows.map((r) => r.property);
}
