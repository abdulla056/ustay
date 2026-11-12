/**
 * Media repository (UST-14). The only module that talks Drizzle about `media_asset`,
 * `property_media` and `room_media`. Conventions: `docs/ARCHITECTURE.md` ("Data access /
 * repository layer") and `docs/DATABASE.md`. The executor is the last param.
 *
 * Same-property rule: every placement (and a video's poster) must use an asset from the owning
 * property's library. The setters check it up front (inside their transaction, with the parent
 * row locked) and throw {@link MediaNotInLibraryError}; the composite foreign keys in
 * `media.schema.ts` enforce both halves again in the database.
 */
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import {
	mediaAsset,
	mediaRole,
	property,
	propertyMedia,
	room,
	roomMedia
} from '$lib/server/db/schema';

export type MediaAsset = typeof mediaAsset.$inferSelect;
export type MediaRole = (typeof mediaRole.enumValues)[number];

/** Input for {@link insertMediaAsset}. The id and timestamps are assigned by the database. */
export type NewMediaAssetInput = Omit<
	typeof mediaAsset.$inferInsert,
	'id' | 'createdAt' | 'updatedAt'
>;

/** Patch for {@link updateMediaAsset}. An asset never moves to another property's library. */
export type MediaAssetPatch = Partial<Omit<NewMediaAssetInput, 'propertyId'>>;

/** Fields a patch may never touch, stripped at runtime (types alone do not stop a cast). */
const IMMUTABLE_FIELDS = ['propertyId', 'id', 'createdAt'];

/** Thrown when an asset id is not in the given property's library (or does not exist). */
export class MediaNotInLibraryError extends Error {
	constructor(
		readonly propertyId: string,
		readonly assetIds: string[]
	) {
		super(`Media asset(s) ${assetIds.join(', ')} not in the library of property ${propertyId}`);
		this.name = 'MediaNotInLibraryError';
	}
}

/** Thrown when a poster is not an image, or an asset that is someone's poster stops being one. */
export class MediaPosterError extends Error {
	constructor(
		readonly assetId: string,
		message: string
	) {
		super(message);
		this.name = 'MediaPosterError';
	}
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Postgres rejects a malformed uuid with a 500-grade error; check the shape before querying. */
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

/** Every asset column, listed so a new column is a deliberate addition to placement payloads. */
const assetColumns = {
	id: mediaAsset.id,
	propertyId: mediaAsset.propertyId,
	kind: mediaAsset.kind,
	url: mediaAsset.url,
	storageKey: mediaAsset.storageKey,
	width: mediaAsset.width,
	height: mediaAsset.height,
	altText: mediaAsset.altText,
	caption: mediaAsset.caption,
	credit: mediaAsset.credit,
	focalX: mediaAsset.focalX,
	focalY: mediaAsset.focalY,
	durationSeconds: mediaAsset.durationSeconds,
	posterAssetId: mediaAsset.posterAssetId,
	createdAt: mediaAsset.createdAt,
	updatedAt: mediaAsset.updatedAt
};

/** Throw unless every id in `assetIds` is an asset in `propertyId`'s library. */
async function assertInLibrary(propertyId: string, assetIds: string[], tx: Executor) {
	if (assetIds.length === 0) return;
	const valid = assetIds.filter(isUuid);
	const found =
		isUuid(propertyId) && valid.length > 0
			? await tx
					.select({ id: mediaAsset.id })
					.from(mediaAsset)
					.where(and(eq(mediaAsset.propertyId, propertyId), inArray(mediaAsset.id, valid)))
			: [];
	const ok = new Set(found.map((row) => row.id));
	const missing = assetIds.filter((id) => !ok.has(id));
	if (missing.length > 0) throw new MediaNotInLibraryError(propertyId, missing);
}

/**
 * A poster must be an image from the same library. Call inside a transaction: the poster row is
 * locked so it cannot change kind between this check and the write.
 */
async function assertPoster(propertyId: string, posterAssetId: string, tx: Executor) {
	if (!isUuid(posterAssetId) || !isUuid(propertyId)) {
		throw new MediaNotInLibraryError(propertyId, [posterAssetId]);
	}
	const [poster] = await tx
		.select({ kind: mediaAsset.kind })
		.from(mediaAsset)
		.where(and(eq(mediaAsset.id, posterAssetId), eq(mediaAsset.propertyId, propertyId)))
		.limit(1)
		.for('update');
	if (!poster) throw new MediaNotInLibraryError(propertyId, [posterAssetId]);
	if (poster.kind !== 'image') {
		throw new MediaPosterError(posterAssetId, `Poster ${posterAssetId} must be an image asset`);
	}
}

/** First occurrence wins, so the order a caller sends is the order stored. */
const dedupe = (ids: string[]) => [...new Set(ids)];

// --- Library ---------------------------------------------------------------------------------

/** The property's whole library, oldest first. */
export async function listMediaAssets(propertyId: string, tx: Executor = db) {
	return tx
		.select(assetColumns)
		.from(mediaAsset)
		.where(eq(mediaAsset.propertyId, propertyId))
		.orderBy(asc(mediaAsset.createdAt));
}

export async function findMediaAssetById(id: string, tx: Executor = db) {
	if (!isUuid(id)) return undefined;
	const [row] = await tx.select().from(mediaAsset).where(eq(mediaAsset.id, id)).limit(1);
	return row;
}

export async function insertMediaAsset(input: NewMediaAssetInput, tx: Executor = db) {
	return tx.transaction(async (inner) => {
		if (input.posterAssetId) await assertPoster(input.propertyId, input.posterAssetId, inner);
		const [row] = await inner.insert(mediaAsset).values(input).returning();
		return row;
	});
}

/**
 * `undefined` if the asset does not exist. `undefined` fields and `propertyId` are ignored; a patch
 * with nothing left returns the current row. Changing `kind` away from `image` is rejected with
 * {@link MediaPosterError} while the asset is another asset's poster.
 */
export async function updateMediaAsset(id: string, patch: MediaAssetPatch, tx: Executor = db) {
	if (!isUuid(id)) return undefined;
	const clean = Object.fromEntries(
		Object.entries(patch).filter(
			([key, value]) => value !== undefined && !IMMUTABLE_FIELDS.includes(key)
		)
	) as MediaAssetPatch;
	if (Object.keys(clean).length === 0) return findMediaAssetById(id, tx);
	return tx.transaction(async (inner) => {
		const [current] = await inner
			.select()
			.from(mediaAsset)
			.where(eq(mediaAsset.id, id))
			.limit(1)
			.for('update');
		if (!current) return undefined;
		if (clean.posterAssetId) await assertPoster(current.propertyId, clean.posterAssetId, inner);
		if (clean.kind !== undefined && clean.kind !== 'image') {
			const [user] = await inner
				.select({ id: mediaAsset.id })
				.from(mediaAsset)
				.where(eq(mediaAsset.posterAssetId, id))
				.limit(1);
			if (user) {
				throw new MediaPosterError(
					id,
					`Asset ${id} is the poster of ${user.id} and must stay an image`
				);
			}
		}
		const [row] = await inner
			.update(mediaAsset)
			.set(clean)
			.where(eq(mediaAsset.id, id))
			.returning();
		return row;
	});
}

/** Deleting an asset removes its placements (cascade) and clears it as a poster (set null). */
export async function deleteMediaAsset(id: string, tx: Executor = db) {
	if (!isUuid(id)) return undefined;
	const [row] = await tx.delete(mediaAsset).where(eq(mediaAsset.id, id)).returning();
	return row;
}

// --- Property placements ---------------------------------------------------------------------

/**
 * The property's placed media with each asset's `role` and `sortOrder`, ordered by role (hero,
 * gallery, thumbnail: the enum order) then position. Pass `role` to list one role only.
 */
export async function listPropertyMedia(propertyId: string, role?: MediaRole, tx: Executor = db) {
	return tx
		.select({ ...assetColumns, role: propertyMedia.role, sortOrder: propertyMedia.sortOrder })
		.from(propertyMedia)
		.innerJoin(mediaAsset, eq(propertyMedia.mediaAssetId, mediaAsset.id))
		.where(
			role
				? and(eq(propertyMedia.propertyId, propertyId), eq(propertyMedia.role, role))
				: eq(propertyMedia.propertyId, propertyId)
		)
		.orderBy(asc(propertyMedia.role), asc(propertyMedia.sortOrder));
}

/** Replace one role's placements with `assetIds`, in order. Runs as a savepoint inside a tx. */
async function replaceRole(propertyId: string, role: MediaRole, assetIds: string[], tx: Executor) {
	const ids = dedupe(assetIds);
	return tx.transaction(async (inner) => {
		// Serialise concurrent replacements on the property; the library check then sees stable rows.
		if (isUuid(propertyId)) {
			await inner
				.select({ id: property.id })
				.from(property)
				.where(eq(property.id, propertyId))
				.for('update');
		}
		await assertInLibrary(propertyId, ids, inner);
		await inner
			.delete(propertyMedia)
			.where(and(eq(propertyMedia.propertyId, propertyId), eq(propertyMedia.role, role)));
		if (ids.length === 0) return;
		await inner
			.insert(propertyMedia)
			.values(
				ids.map((mediaAssetId, sortOrder) => ({ propertyId, mediaAssetId, role, sortOrder }))
			);
	});
}

/**
 * Replace the gallery with `assetIds`, in that order. Duplicates collapse to their first position;
 * an empty list clears the gallery. Throws {@link MediaNotInLibraryError} (and changes nothing)
 * if any id is not in the property's library.
 */
export async function setPropertyGallery(
	propertyId: string,
	assetIds: string[],
	tx: Executor = db
) {
	return replaceRole(propertyId, 'gallery', assetIds, tx);
}

/** Set the property's single hero, or clear it with `null`. Same library check as the gallery. */
export async function setPropertyHero(
	propertyId: string,
	assetId: string | null,
	tx: Executor = db
) {
	return replaceRole(propertyId, 'hero', assetId ? [assetId] : [], tx);
}

/** Set the property's thumbnail, or clear it with `null`. Same library check as the hero. */
export async function setPropertyThumbnail(
	propertyId: string,
	assetId: string | null,
	tx: Executor = db
) {
	return replaceRole(propertyId, 'thumbnail', assetId ? [assetId] : [], tx);
}

// --- Room placements -------------------------------------------------------------------------

/** The room's media, in order. */
export async function listRoomMedia(roomId: string, tx: Executor = db) {
	return tx
		.select({ ...assetColumns, sortOrder: roomMedia.sortOrder })
		.from(roomMedia)
		.innerJoin(mediaAsset, eq(roomMedia.mediaAssetId, mediaAsset.id))
		.where(eq(roomMedia.roomId, roomId))
		.orderBy(asc(roomMedia.sortOrder));
}

/**
 * Replace the room's media with `assetIds`, in that order. The assets must be in the library of
 * the room's property, else {@link MediaNotInLibraryError}. Throws if the room does not exist.
 */
export async function setRoomMedia(roomId: string, assetIds: string[], tx: Executor = db) {
	const ids = dedupe(assetIds);
	return tx.transaction(async (inner) => {
		// Locking the room serialises concurrent replacements of its media.
		const [owner] = isUuid(roomId)
			? await inner
					.select({ propertyId: room.propertyId })
					.from(room)
					.where(eq(room.id, roomId))
					.limit(1)
					.for('update')
			: [];
		if (!owner) throw new Error(`Room ${roomId} not found`);
		await assertInLibrary(owner.propertyId, ids, inner);
		await inner.delete(roomMedia).where(eq(roomMedia.roomId, roomId));
		if (ids.length === 0) return;
		await inner.insert(roomMedia).values(
			ids.map((mediaAssetId, sortOrder) => ({
				roomId,
				propertyId: owner.propertyId,
				mediaAssetId,
				sortOrder
			}))
		);
	});
}
