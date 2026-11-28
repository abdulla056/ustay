/**
 * Destination repository (UST-16). The only module that talks Drizzle about `destination`.
 * Destinations are platform-curated (not per-owner) and group properties for discovery (Phase 5).
 * Conventions: `docs/ARCHITECTURE.md` and `docs/DATABASE.md`. The executor is the last param.
 */
import { and, asc, eq } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { isUuid, pgErrorCode } from '$lib/server/db/helpers';
import {
	destination,
	destinationSlugRedirect,
	property,
	propertyLocation
} from '$lib/server/db/schema';
import { slugify, uniqueSlug } from '$lib/server/db/slug';
import {
	countryCode,
	optionalText,
	pick,
	requiredText,
	type ErrorFactory
} from '$lib/server/validate';

export type Destination = typeof destination.$inferSelect;

/** Input for {@link createDestination}. A `slug` may pin one, otherwise it comes from the name. */
export type NewDestinationInput = Omit<
	typeof destination.$inferInsert,
	'id' | 'slug' | 'createdAt' | 'updatedAt'
> & { slug?: string };

/** Patch for {@link updateDestination}. The slug is not patchable here (use {@link renameDestination}). */
export type DestinationPatch = Partial<Omit<NewDestinationInput, 'slug'>>;

/** Thrown for blank names, bad country codes or wrong-typed fields. */
export class DestinationValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DestinationValidationError';
	}
}

/** Thrown when a destination id is malformed or no such destination exists. */
export class DestinationNotFoundError extends Error {
	constructor(readonly destinationId: string) {
		super(`Destination ${destinationId} not found`);
		this.name = 'DestinationNotFoundError';
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

/**
 * Is `candidate` unavailable as a slug? A live slug is taken, and so is a retired one, so a slug
 * that was once used is never handed to another destination. `exceptDestinationId` lets a rename
 * reuse its own current slug and its own retired slugs.
 */
async function isSlugTaken(candidate: string, tx: Executor, exceptDestinationId?: string) {
	const [live] = await tx
		.select({ id: destination.id })
		.from(destination)
		.where(eq(destination.slug, candidate))
		.limit(1);
	if (live && live.id !== exceptDestinationId) return true;

	const [retired] = await tx
		.select({ destinationId: destinationSlugRedirect.destinationId })
		.from(destinationSlugRedirect)
		.where(eq(destinationSlugRedirect.oldSlug, candidate))
		.limit(1);
	return retired !== undefined && retired.destinationId !== exceptDestinationId;
}

/**
 * Create a destination. A caller-supplied `slug` is normalised with `slugify`; one that is empty
 * after that, or already taken (also when a concurrent insert wins the race), is a
 * {@link DestinationValidationError}, never a raw unique-violation.
 */
export async function createDestination(input: NewDestinationInput, tx: Executor = db) {
	const values = clean(input);
	if (values.name === undefined || values.countryCode === undefined) {
		throw fail('name and countryCode are required');
	}
	const name = values.name as string;
	let slug: string;
	if (input.slug !== undefined) {
		if (typeof input.slug !== 'string') throw fail('slug must be a string');
		slug = slugify(input.slug);
		if (slug === '') throw fail('slug must contain letters or digits');
		if (await isSlugTaken(slug, tx)) throw fail(`slug "${slug}" is already taken`);
	} else {
		slug = await uniqueSlug(name, (c) => isSlugTaken(c, tx));
	}
	try {
		// A savepoint, so a lost race does not abort a caller's surrounding transaction.
		return await tx.transaction(async (inner) => {
			const [row] = await inner
				.insert(destination)
				.values({ ...values, name, countryCode: values.countryCode as string, slug })
				.returning();
			return row;
		});
	} catch (error) {
		if (pgErrorCode(error) === '23505') throw fail(`slug "${slug}" is already taken`);
		throw error;
	}
}

/** `undefined` for an unknown slug. */
export async function findDestinationBySlug(slug: string, tx: Executor = db) {
	if (typeof slug !== 'string') return undefined;
	const [row] = await tx.select().from(destination).where(eq(destination.slug, slug)).limit(1);
	return row;
}

/**
 * Resolve a retired slug to its destination's current slug in one query. `undefined` if it was
 * never a slug (or is a live slug: look that up with {@link findDestinationBySlug}).
 */
export async function findDestinationRedirectTarget(oldSlug: string, tx: Executor = db) {
	if (typeof oldSlug !== 'string') return undefined;
	const [row] = await tx
		.select({ slug: destination.slug })
		.from(destinationSlugRedirect)
		.innerJoin(destination, eq(destinationSlugRedirect.destinationId, destination.id))
		.where(eq(destinationSlugRedirect.oldSlug, oldSlug))
		.limit(1);
	return row?.slug;
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

/**
 * Rename a destination. Runs in one transaction, locking the row first. `newSlug` (optional) is
 * normalised with `slugify`; otherwise one is generated from the new name. If the slug changes,
 * the old one is written to the redirect table. Renaming back to one of the destination's own
 * retired slugs removes that redirect row. A slug that is empty after normalising, or live or
 * retired for another destination (also when a concurrent writer wins the race), is a
 * {@link DestinationValidationError}; an unknown id is a {@link DestinationNotFoundError}.
 */
export async function renameDestination(
	id: string,
	newName: string,
	opts: { newSlug?: string } = {}
) {
	const name = requiredText(newName, 'name', fail);
	if (!isUuid(id)) throw new DestinationNotFoundError(String(id));
	try {
		return await db.transaction(async (tx) => {
			const [current] = await tx
				.select({ slug: destination.slug })
				.from(destination)
				.where(eq(destination.id, id))
				.limit(1)
				.for('update');
			if (!current) throw new DestinationNotFoundError(id);

			let newSlug: string;
			if (opts.newSlug !== undefined) {
				if (typeof opts.newSlug !== 'string') throw fail('slug must be a string');
				newSlug = slugify(opts.newSlug);
				if (newSlug === '') throw fail('slug must contain letters or digits');
				if (await isSlugTaken(newSlug, tx, id)) throw fail(`slug "${newSlug}" is already taken`);
			} else {
				newSlug = await uniqueSlug(name, (c) => isSlugTaken(c, tx, id));
			}

			if (newSlug !== current.slug) {
				// Renaming back to one of its own retired slugs: that redirect row is about to
				// become the live slug, so it has to go first.
				await tx
					.delete(destinationSlugRedirect)
					.where(
						and(
							eq(destinationSlugRedirect.oldSlug, newSlug),
							eq(destinationSlugRedirect.destinationId, id)
						)
					);
				await tx
					.insert(destinationSlugRedirect)
					.values({ oldSlug: current.slug, destinationId: id });
			}

			const [row] = await tx
				.update(destination)
				.set({ name, slug: newSlug })
				.where(eq(destination.id, id))
				.returning();
			return row;
		});
	} catch (error) {
		if (pgErrorCode(error) === '23505') throw fail('slug is already taken');
		throw error;
	}
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
