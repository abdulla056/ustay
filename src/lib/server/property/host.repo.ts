/**
 * Host repository (UST-15). The only module that talks Drizzle about `host_profile`.
 * Conventions: `docs/ARCHITECTURE.md` ("Data access / repository layer") and `docs/DATABASE.md`.
 * The executor is the last param.
 *
 * The host profile is 1:1 with a property. The avatar must be an image from the same property's
 * library: checked here (inside the transaction, asset row locked `FOR UPDATE`) and again by the
 * composite foreign key in `host.schema.ts`.
 */
import { and, eq } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { hostProfile, mediaAsset, property } from '$lib/server/db/schema';
import { isUuid, MediaNotInLibraryError } from './media.repo';
import { PropertyNotFoundError } from './property.repo';

export type HostProfile = typeof hostProfile.$inferSelect;

/** Fields of a host profile a caller may write. The avatar goes through {@link setHostAvatar}. */
export type HostProfileInput = Partial<
	Omit<typeof hostProfile.$inferInsert, 'propertyId' | 'avatarAssetId' | 'createdAt' | 'updatedAt'>
>;

/** Thrown for input the database cannot express (the `hosting_since` upper bound, blank name). */
export class HostProfileValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'HostProfileValidationError';
	}
}

/** Thrown when a property has no host profile to modify. */
export class HostProfileNotFoundError extends Error {
	constructor(readonly propertyId: string) {
		super(`Property ${propertyId} has no host profile`);
		this.name = 'HostProfileNotFoundError';
	}
}

/** Thrown when an avatar asset is not an image. */
export class HostAvatarError extends Error {
	constructor(
		readonly assetId: string,
		message: string
	) {
		super(message);
		this.name = 'HostAvatarError';
	}
}

/** Only these keys survive into a write: types alone do not stop a cast from smuggling others. */
const WRITABLE_FIELDS = ['displayName', 'bio', 'hostingSince', 'languages'] as const;

/** `undefined` for an unknown or malformed property id. */
export async function getHostProfile(propertyId: string, tx: Executor = db) {
	if (!isUuid(propertyId)) return undefined;
	const [row] = await tx
		.select()
		.from(hostProfile)
		.where(eq(hostProfile.propertyId, propertyId))
		.limit(1);
	return row;
}

/** Lock the property row (serialises concurrent writes on it) or throw if it does not exist. */
async function lockProperty(propertyId: string, tx: Executor) {
	if (!isUuid(propertyId)) throw new PropertyNotFoundError(propertyId);
	const [row] = await tx
		.select({ id: property.id })
		.from(property)
		.where(eq(property.id, propertyId))
		.limit(1)
		.for('update');
	if (!row) throw new PropertyNotFoundError(propertyId);
}

/**
 * Create the property's host profile, or patch the existing one. `undefined` fields, the avatar
 * and `propertyId` are ignored; `null` clears a nullable field. Creating needs a `displayName`.
 * Throws {@link PropertyNotFoundError}, or {@link HostProfileValidationError} for a blank name or
 * a `hostingSince` outside 1900..current year.
 */
export async function upsertHostProfile(
	propertyId: string,
	input: HostProfileInput,
	tx: Executor = db
) {
	const clean = Object.fromEntries(
		WRITABLE_FIELDS.filter((key) => input[key] !== undefined).map((key) => [key, input[key]])
	) as HostProfileInput;
	if (clean.displayName !== undefined) {
		clean.displayName = clean.displayName.trim();
		if (clean.displayName === '') throw new HostProfileValidationError('displayName is required');
	}
	if (clean.hostingSince != null) {
		const year = new Date().getFullYear();
		if (
			!Number.isInteger(clean.hostingSince) ||
			clean.hostingSince < 1900 ||
			clean.hostingSince > year
		) {
			throw new HostProfileValidationError(`hostingSince must be a year from 1900 to ${year}`);
		}
	}
	return tx.transaction(async (inner) => {
		await lockProperty(propertyId, inner);
		const existing = await getHostProfile(propertyId, inner);
		if (existing) {
			if (Object.keys(clean).length === 0) return existing;
			const [row] = await inner
				.update(hostProfile)
				.set(clean)
				.where(eq(hostProfile.propertyId, propertyId))
				.returning();
			return row;
		}
		if (clean.displayName === undefined) {
			throw new HostProfileValidationError('displayName is required to create a host profile');
		}
		const [row] = await inner
			.insert(hostProfile)
			.values({ ...clean, displayName: clean.displayName, propertyId })
			.returning();
		return row;
	});
}

/**
 * Set the host's avatar to an image in the property's library, or clear it with `null`. Throws
 * {@link HostProfileNotFoundError} without a profile, {@link MediaNotInLibraryError} for an asset
 * outside the library, {@link HostAvatarError} for a non-image.
 */
export async function setHostAvatar(propertyId: string, assetId: string | null, tx: Executor = db) {
	return tx.transaction(async (inner) => {
		await lockProperty(propertyId, inner);
		if (assetId !== null) {
			if (!isUuid(assetId)) throw new MediaNotInLibraryError(propertyId, [assetId]);
			const [asset] = await inner
				.select({ kind: mediaAsset.kind })
				.from(mediaAsset)
				.where(and(eq(mediaAsset.id, assetId), eq(mediaAsset.propertyId, propertyId)))
				.limit(1)
				.for('update');
			if (!asset) throw new MediaNotInLibraryError(propertyId, [assetId]);
			if (asset.kind !== 'image') {
				throw new HostAvatarError(assetId, `Avatar ${assetId} must be an image asset`);
			}
		}
		const [row] = await inner
			.update(hostProfile)
			.set({ avatarAssetId: assetId })
			.where(eq(hostProfile.propertyId, propertyId))
			.returning();
		if (!row) throw new HostProfileNotFoundError(propertyId);
		return row;
	});
}

/** Delete the profile. `undefined` if there was none (or the id is malformed). */
export async function deleteHostProfile(propertyId: string, tx: Executor = db) {
	if (!isUuid(propertyId)) return undefined;
	const [row] = await tx
		.delete(hostProfile)
		.where(eq(hostProfile.propertyId, propertyId))
		.returning();
	return row;
}
