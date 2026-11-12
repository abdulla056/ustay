/**
 * Host repository (UST-15). The only module that talks Drizzle about `host_profile`.
 * Conventions: `docs/ARCHITECTURE.md` ("Data access / repository layer") and `docs/DATABASE.md`.
 * The executor is the last param.
 *
 * The host profile is 1:1 with a property. The avatar must be an image from the same property's
 * library: checked here (inside the transaction, asset row locked `FOR UPDATE`) and again by the
 * composite foreign key in `host.schema.ts`.
 */
import { eq } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { isUuid } from '$lib/server/db/helpers';
import { hostProfile } from '$lib/server/db/schema';
import { optionalText, requiredText, type ErrorFactory } from '$lib/server/validate';
import { assertImageInLibrary, HostAvatarError } from './media.repo';
import { lockPropertyOrThrow } from './property.repo';

export { HostAvatarError };

export type HostProfile = typeof hostProfile.$inferSelect;

/** Fields of a host profile a caller may write. The avatar goes through {@link setHostAvatar}. */
export type HostProfileInput = Partial<
	Omit<typeof hostProfile.$inferInsert, 'propertyId' | 'avatarAssetId' | 'createdAt' | 'updatedAt'>
>;

/**
 * Thrown for input the types allow but the data model does not: a missing, blank or non-string
 * `displayName`, a non-string `bio`, `languages` that is not an array of strings, or a
 * `hostingSince` that is not an integer year from 1900 to the current year in the property's
 * timezone.
 */
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

const fail: ErrorFactory = (m) => new HostProfileValidationError(m);

/** Only these keys survive into a write: types alone do not stop a cast from smuggling others. */
const WRITABLE_FIELDS = ['displayName', 'bio', 'hostingSince', 'languages'] as const;

/** The current calendar year in `timeZone` (the property's), not the server's. */
function currentYear(timeZone: string): number {
	return Number(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(new Date()));
}

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

/** Validate and normalise a patch: trim text, blank bio becomes null, tidy languages. */
function cleanInput(input: HostProfileInput, timeZone: string): HostProfileInput {
	const raw = input as Record<string, unknown>;
	const clean: Record<string, unknown> = {};
	for (const key of WRITABLE_FIELDS) if (raw[key] !== undefined) clean[key] = raw[key];

	if ('displayName' in clean) {
		clean.displayName = requiredText(clean.displayName, 'displayName', fail);
	}
	// A blank bio means "no bio": stored as null, never as an empty string.
	if ('bio' in clean) clean.bio = optionalText(clean.bio, 'bio', fail);
	if ('languages' in clean) {
		if (!Array.isArray(clean.languages) || clean.languages.some((l) => typeof l !== 'string')) {
			throw new HostProfileValidationError('languages must be an array of strings');
		}
		clean.languages = [
			...new Set((clean.languages as string[]).map((l) => l.trim()).filter((l) => l !== ''))
		];
	}
	if ('hostingSince' in clean && clean.hostingSince !== null) {
		const year = currentYear(timeZone);
		const v = clean.hostingSince;
		if (typeof v !== 'number' || !Number.isInteger(v) || v < 1900 || v > year) {
			throw new HostProfileValidationError(`hostingSince must be a year from 1900 to ${year}`);
		}
	}
	return clean as HostProfileInput;
}

/**
 * Create the property's host profile, or patch the existing one. `undefined` fields, the avatar
 * and `propertyId` are ignored; `null` clears `bio` and `hostingSince`. Text is trimmed and a
 * blank `bio` is stored as null. Creating needs a `displayName`. Throws
 * {@link PropertyNotFoundError} or {@link HostProfileValidationError}.
 */
export async function upsertHostProfile(
	propertyId: string,
	input: HostProfileInput,
	tx: Executor = db
) {
	return tx.transaction(async (inner) => {
		const owner = await lockPropertyOrThrow(propertyId, inner);
		const clean = cleanInput(input, owner.timezone);
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
 * {@link HostProfileNotFoundError} without a profile, `MediaNotInLibraryError` for an asset
 * outside the library, {@link HostAvatarError} for a non-image.
 */
export async function setHostAvatar(propertyId: string, assetId: string | null, tx: Executor = db) {
	return tx.transaction(async (inner) => {
		await lockPropertyOrThrow(propertyId, inner);
		if (assetId !== null) {
			await assertImageInLibrary(
				propertyId,
				assetId,
				inner,
				(id) => new HostAvatarError(id, `Avatar ${id} must be an image asset`)
			);
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
