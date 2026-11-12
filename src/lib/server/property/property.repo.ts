/**
 * Property repository (UST-11). The only module that talks Drizzle about `property` and
 * `property_slug_redirect`. Conventions: `docs/ARCHITECTURE.md` ("Data access / repository layer")
 * and `docs/DATABASE.md` (slugs). No `error()` / `redirect()` here: a miss is `undefined`.
 */
import { and, eq } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { property, propertySlugRedirect } from '$lib/server/db/schema';
import { uniqueSlug } from '$lib/server/db/slug';
import { isUuid } from './media.repo';

/**
 * Input for {@link insertProperty}. The id, timestamps and slug are assigned here, so they are
 * not accepted; a `slug` may be passed to pin one, otherwise it is generated from the name.
 */
export type NewPropertyInput = Omit<
	typeof property.$inferInsert,
	'id' | 'slug' | 'createdAt' | 'updatedAt'
> & { slug?: string };

/**
 * Is `candidate` unavailable as a slug? A live slug is taken, and so is a retired one, so a
 * slug that was once used is never handed to another property. `exceptPropertyId` lets a rename
 * reuse its own current slug and its own retired slugs.
 */
async function isSlugTaken(
	candidate: string,
	tx: Executor,
	exceptPropertyId?: string
): Promise<boolean> {
	const [live] = await tx
		.select({ id: property.id })
		.from(property)
		.where(eq(property.slug, candidate))
		.limit(1);
	if (live && live.id !== exceptPropertyId) return true;

	const [retired] = await tx
		.select({ propertyId: propertySlugRedirect.propertyId })
		.from(propertySlugRedirect)
		.where(eq(propertySlugRedirect.oldSlug, candidate))
		.limit(1);
	return retired !== undefined && retired.propertyId !== exceptPropertyId;
}

export async function findPropertyBySlug(slug: string, tx: Executor = db) {
	const [row] = await tx.select().from(property).where(eq(property.slug, slug)).limit(1);
	return row;
}

export async function findPropertyById(id: string, tx: Executor = db) {
	const [row] = await tx.select().from(property).where(eq(property.id, id)).limit(1);
	return row;
}

/** Resolve a retired slug to the property's current slug. `undefined` if it was never a slug. */
export async function findRedirectedSlug(oldSlug: string, tx: Executor = db) {
	const [row] = await tx
		.select({ slug: property.slug })
		.from(propertySlugRedirect)
		.innerJoin(property, eq(propertySlugRedirect.propertyId, property.id))
		.where(eq(propertySlugRedirect.oldSlug, oldSlug))
		.limit(1);
	return row?.slug;
}

export async function insertProperty(input: NewPropertyInput, tx: Executor = db) {
	const slug = input.slug ?? (await uniqueSlug(input.name, (c) => isSlugTaken(c, tx)));
	const [row] = await tx
		.insert(property)
		.values({ ...input, slug })
		.returning();
	return row;
}

/**
 * Rename a property. Runs in its own transaction: if the slug changes, the old slug is written to
 * the redirect table and the name and slug are updated together.
 */
export async function renameProperty(id: string, newName: string, opts: { newSlug?: string } = {}) {
	return db.transaction(async (tx) => {
		const [current] = await tx
			.select({ slug: property.slug })
			.from(property)
			.where(eq(property.id, id))
			.limit(1);
		if (!current) throw new Error(`Property ${id} not found`);

		const newSlug = opts.newSlug ?? (await uniqueSlug(newName, (c) => isSlugTaken(c, tx, id)));

		if (newSlug !== current.slug) {
			// Renaming back to one of this property's own retired slugs: that redirect row is
			// about to become the live slug, so it has to go first.
			await tx
				.delete(propertySlugRedirect)
				.where(
					and(eq(propertySlugRedirect.oldSlug, newSlug), eq(propertySlugRedirect.propertyId, id))
				);
			await tx.insert(propertySlugRedirect).values({ oldSlug: current.slug, propertyId: id });
		}

		const [row] = await tx
			.update(property)
			.set({ name: newName, slug: newSlug })
			.where(eq(property.id, id))
			.returning();
		return row;
	});
}

export async function publishProperty(id: string, tx: Executor = db) {
	const [row] = await tx
		.update(property)
		.set({ status: 'published', publishedAt: new Date() })
		.where(eq(property.id, id))
		.returning();
	return row;
}

/** Thrown when a property id is malformed or no such property exists. */
export class PropertyNotFoundError extends Error {
	constructor(readonly propertyId: string) {
		super(`Property ${propertyId} not found`);
		this.name = 'PropertyNotFoundError';
	}
}

/**
 * Set or clear the property's story (heading and markdown body, stored raw). `null` clears a
 * field; `undefined` leaves it alone. Throws {@link PropertyNotFoundError} for an unknown or
 * malformed id. A present value must not be blank (a database check).
 */
export async function setPropertyStory(
	propertyId: string,
	story: { heading?: string | null; body?: string | null },
	tx: Executor = db
) {
	if (!isUuid(propertyId)) throw new PropertyNotFoundError(propertyId);
	const patch: Partial<typeof property.$inferInsert> = {};
	if (story.heading !== undefined) patch.storyHeading = story.heading;
	if (story.body !== undefined) patch.storyBody = story.body;
	if (Object.keys(patch).length === 0) {
		const row = await findPropertyById(propertyId, tx);
		if (!row) throw new PropertyNotFoundError(propertyId);
		return row;
	}
	const [row] = await tx.update(property).set(patch).where(eq(property.id, propertyId)).returning();
	if (!row) throw new PropertyNotFoundError(propertyId);
	return row;
}
