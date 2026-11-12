import { describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/test/db';
import { hostProfile, mediaAsset, property } from '$lib/server/db/schema';
import {
	insertMediaAsset,
	MediaNotInLibraryError,
	updateMediaAsset,
	type NewMediaAssetInput
} from './media.repo';
import {
	insertProperty,
	PropertyNotFoundError,
	PropertyValidationError,
	setPropertyStory
} from './property.repo';
import {
	deleteHostProfile,
	getHostProfile,
	HostAvatarError,
	HostProfileNotFoundError,
	HostProfileValidationError,
	setHostAvatar,
	upsertHostProfile
} from './host.repo';

const base = { type: 'boutique', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' } as const;
const makeProperty = (name: string) => insertProperty({ ...base, name });

let n = 0;
function makeAsset(propertyId: string, overrides: Partial<NewMediaAssetInput> = {}) {
	n += 1;
	return insertMediaAsset({
		propertyId,
		kind: 'image',
		url: `https://images.example.com/host-${n}.jpg`,
		width: 800,
		height: 800,
		altText: `Host photo ${n}`,
		...overrides
	});
}

async function pgCode(promise: Promise<unknown>): Promise<string | undefined> {
	try {
		await promise;
	} catch (error) {
		const e = error as { code?: string; cause?: { code?: string } };
		return e.cause?.code ?? e.code;
	}
	return undefined;
}

const CHECK_VIOLATION = '23514';
const FK_VIOLATION = '23503';

describe('host profile', () => {
	it('creates, patches and reads; a second upsert updates the same row', async () => {
		const p = await makeProperty('Hosted');
		expect(await getHostProfile(p.id)).toBeUndefined();

		const created = await upsertHostProfile(p.id, {
			displayName: '  Aminah  ',
			bio: 'Hello',
			hostingSince: 2010,
			languages: ['en', 'ms']
		});
		expect(created.displayName).toBe('Aminah');
		expect(created.languages).toEqual(['en', 'ms']);

		const patched = await upsertHostProfile(p.id, { bio: null, displayName: undefined });
		expect(patched.bio).toBeNull();
		expect(patched.displayName).toBe('Aminah');
		expect(patched.hostingSince).toBe(2010);
		expect(await db.select().from(hostProfile)).toHaveLength(1);
	});

	it('defaults languages to empty and ignores propertyId and avatar in the patch', async () => {
		const p = await makeProperty('Strip');
		const other = await makeProperty('Other');
		const a = await makeAsset(p.id);
		const row = await upsertHostProfile(p.id, {
			displayName: 'A',
			propertyId: other.id,
			avatarAssetId: a.id
		} as never);
		expect(row.propertyId).toBe(p.id);
		expect(row.avatarAssetId).toBeNull();
		expect(row.languages).toEqual([]);
		expect(await getHostProfile(other.id)).toBeUndefined();
	});

	it('validates input and ids', async () => {
		const p = await makeProperty('Validate');
		const year = new Date().getFullYear();
		await expect(upsertHostProfile(p.id, { bio: 'x' })).rejects.toBeInstanceOf(
			HostProfileValidationError
		);
		await expect(upsertHostProfile(p.id, { displayName: '   ' })).rejects.toBeInstanceOf(
			HostProfileValidationError
		);
		await expect(
			upsertHostProfile(p.id, { displayName: 'A', hostingSince: 1899 })
		).rejects.toBeInstanceOf(HostProfileValidationError);
		await expect(
			upsertHostProfile(p.id, { displayName: 'A', hostingSince: year + 1 })
		).rejects.toBeInstanceOf(HostProfileValidationError);
		const ok = await upsertHostProfile(p.id, { displayName: 'A', hostingSince: year });
		expect(ok.hostingSince).toBe(year);

		await expect(upsertHostProfile('nope', { displayName: 'A' })).rejects.toBeInstanceOf(
			PropertyNotFoundError
		);
		await expect(
			upsertHostProfile(crypto.randomUUID(), { displayName: 'A' })
		).rejects.toBeInstanceOf(PropertyNotFoundError);
		expect(await getHostProfile('nope')).toBeUndefined();
		expect(await deleteHostProfile('nope')).toBeUndefined();
	});

	it('trims text, turns a blank bio into null and tidies languages', async () => {
		const p = await makeProperty('Normalise');
		const row = await upsertHostProfile(p.id, {
			displayName: 'A',
			bio: '  ',
			languages: [' en ', 'ms', 'en', '  ']
		});
		expect(row.bio).toBeNull();
		expect(row.languages).toEqual(['en', 'ms']);
		expect((await upsertHostProfile(p.id, { bio: '  Hi  ' })).bio).toBe('Hi');
	});

	it('rejects wrong types with a typed error, not a crash or a raw pg error', async () => {
		const p = await makeProperty('Casts');
		await upsertHostProfile(p.id, { displayName: 'A' });
		for (const bad of [
			{ displayName: null },
			{ displayName: 5 },
			{ bio: 5 },
			{ languages: null },
			{ languages: 'en' },
			{ languages: ['en', 3] },
			{ hostingSince: '2010' },
			{ hostingSince: 2010.5 }
		]) {
			await expect(
				upsertHostProfile(p.id, bad as never),
				JSON.stringify(bad)
			).rejects.toBeInstanceOf(HostProfileValidationError);
		}
	});

	it('computes "this year" in the property timezone', async () => {
		// Pacific/Kiritimati is UTC+14 and Etc/GMT+12 is UTC-12: they differ by a calendar day, so
		// on 31 Dec / 1 Jan UTC they straddle a year boundary.
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			vi.setSystemTime(new Date('2030-12-31T12:00:00Z'));
			const east = await insertProperty({ ...base, name: 'East', timezone: 'Pacific/Kiritimati' });
			const west = await insertProperty({ ...base, name: 'West', timezone: 'Etc/GMT+12' });
			expect(
				(await upsertHostProfile(east.id, { displayName: 'A', hostingSince: 2031 })).hostingSince
			).toBe(2031);
			await expect(
				upsertHostProfile(west.id, { displayName: 'A', hostingSince: 2031 })
			).rejects.toBeInstanceOf(HostProfileValidationError);
		} finally {
			vi.useRealTimers();
		}
	});

	it('enforces the checks in the database too', async () => {
		const p = await makeProperty('Db checks');
		const insert = (values: Partial<typeof hostProfile.$inferInsert>) =>
			db.insert(hostProfile).values({ propertyId: p.id, displayName: 'A', ...values });
		expect(await pgCode(insert({ displayName: '  ' }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ hostingSince: 1850 }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ bio: ' ' }))).toBe(CHECK_VIOLATION);
	});

	it('cascades when the property is deleted', async () => {
		const p = await makeProperty('Cascade');
		await upsertHostProfile(p.id, { displayName: 'A' });
		await db.delete(property).where(eq(property.id, p.id));
		expect(await getHostProfile(p.id)).toBeUndefined();
	});

	it('deletes the profile', async () => {
		const p = await makeProperty('Delete');
		await upsertHostProfile(p.id, { displayName: 'A' });
		expect((await deleteHostProfile(p.id))?.displayName).toBe('A');
		expect(await deleteHostProfile(p.id)).toBeUndefined();
	});
});

describe('host avatar', () => {
	it('sets, clears, and is nulled when the asset is deleted', async () => {
		const p = await makeProperty('Avatar');
		await upsertHostProfile(p.id, { displayName: 'A' });
		const a = await makeAsset(p.id);
		expect((await setHostAvatar(p.id, a.id)).avatarAssetId).toBe(a.id);
		expect((await setHostAvatar(p.id, null)).avatarAssetId).toBeNull();

		await setHostAvatar(p.id, a.id);
		await db.delete(mediaAsset).where(eq(mediaAsset.id, a.id));
		const after = await getHostProfile(p.id);
		expect(after?.avatarAssetId).toBeNull();
		expect(after?.propertyId).toBe(p.id);
	});

	it('rejects another property, non-images, malformed ids and a missing profile', async () => {
		const p = await makeProperty('Avatar rules');
		const other = await makeProperty('Elsewhere');
		await upsertHostProfile(p.id, { displayName: 'A' });
		const foreign = await makeAsset(other.id);
		await expect(setHostAvatar(p.id, foreign.id)).rejects.toBeInstanceOf(MediaNotInLibraryError);
		await expect(setHostAvatar(p.id, 'nope')).rejects.toBeInstanceOf(MediaNotInLibraryError);

		const video = await makeAsset(p.id, { kind: 'video', durationSeconds: 5 });
		await expect(setHostAvatar(p.id, video.id)).rejects.toBeInstanceOf(HostAvatarError);

		await expect(setHostAvatar('nope', null)).rejects.toBeInstanceOf(PropertyNotFoundError);
		const bare = await makeProperty('No host');
		const img = await makeAsset(bare.id);
		await expect(setHostAvatar(bare.id, img.id)).rejects.toBeInstanceOf(HostProfileNotFoundError);
	});

	it('keeps an avatar asset an image', async () => {
		const p = await makeProperty('Avatar kind');
		await upsertHostProfile(p.id, { displayName: 'A' });
		const a = await makeAsset(p.id);
		await setHostAvatar(p.id, a.id);
		await expect(
			updateMediaAsset(a.id, { kind: 'video', durationSeconds: 3 })
		).rejects.toBeInstanceOf(HostAvatarError);
		expect((await updateMediaAsset(a.id, { altText: 'Still fine' }))?.kind).toBe('image');
		await setHostAvatar(p.id, null);
		expect((await updateMediaAsset(a.id, { kind: 'video', durationSeconds: 3 }))?.kind).toBe(
			'video'
		);
	});

	it('is enforced by the composite foreign key as well', async () => {
		const p = await makeProperty('Avatar fk');
		const other = await makeProperty('Avatar fk other');
		await upsertHostProfile(p.id, { displayName: 'A' });
		const foreign = await makeAsset(other.id);
		expect(
			await pgCode(
				db
					.update(hostProfile)
					.set({ avatarAssetId: foreign.id })
					.where(eq(hostProfile.propertyId, p.id))
			)
		).toBe(FK_VIOLATION);
	});
});

describe('property story', () => {
	it('sets, partially updates and clears', async () => {
		const p = await makeProperty('Story');
		expect(p.storyHeading).toBeNull();
		const set = await setPropertyStory(p.id, { heading: 'Our history', body: '# Hello\n\nText' });
		expect([set.storyHeading, set.storyBody]).toEqual(['Our history', '# Hello\n\nText']);

		const partial = await setPropertyStory(p.id, { heading: 'New' });
		expect([partial.storyHeading, partial.storyBody]).toEqual(['New', '# Hello\n\nText']);
		expect((await setPropertyStory(p.id, {})).storyHeading).toBe('New');

		const cleared = await setPropertyStory(p.id, { heading: null, body: null });
		expect([cleared.storyHeading, cleared.storyBody]).toEqual([null, null]);
	});

	it('trims, treats blank as cleared, and rejects non-strings', async () => {
		const p = await makeProperty('Story rules');
		const set = await setPropertyStory(p.id, { heading: '  Roots  ', body: 'Text' });
		expect(set.storyHeading).toBe('Roots');
		const blank = await setPropertyStory(p.id, { heading: '   ', body: '\n' });
		expect([blank.storyHeading, blank.storyBody]).toEqual([null, null]);
		await expect(setPropertyStory(p.id, { body: 5 as never })).rejects.toBeInstanceOf(
			PropertyValidationError
		);
		const raw = (v: string) =>
			db.update(property).set({ storyBody: v }).where(eq(property.id, p.id));
		expect(await pgCode(raw('  '))).toBe(CHECK_VIOLATION);
	});

	it('rejects unknown properties', async () => {
		await expect(setPropertyStory('nope', { body: 'x' })).rejects.toBeInstanceOf(
			PropertyNotFoundError
		);
		await expect(setPropertyStory(crypto.randomUUID(), { body: 'x' })).rejects.toBeInstanceOf(
			PropertyNotFoundError
		);
	});
});
