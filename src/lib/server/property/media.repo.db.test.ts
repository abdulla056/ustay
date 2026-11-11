import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/test/db';
import { mediaAsset, property, propertyMedia, room, roomMedia } from '$lib/server/db/schema';
import { insertProperty } from './property.repo';
import { insertRoom } from './room.repo';
import {
	deleteMediaAsset,
	findMediaAssetById,
	insertMediaAsset,
	listMediaAssets,
	listPropertyMedia,
	listRoomMedia,
	MediaNotInLibraryError,
	setPropertyGallery,
	setPropertyHero,
	setRoomMedia,
	updateMediaAsset,
	type NewMediaAssetInput
} from './media.repo';

const base = { type: 'boutique', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' } as const;
const roomBase = { maxGuests: 2, nightlyRateMinor: 15000 };

const makeProperty = (name: string) => insertProperty({ ...base, name });

let n = 0;
/** An image asset in `propertyId`'s library; `overrides` replace any field. */
function makeImage(propertyId: string, overrides: Partial<NewMediaAssetInput> = {}) {
	n += 1;
	return insertMediaAsset({
		propertyId,
		kind: 'image',
		url: `https://images.example.com/${n}.jpg`,
		width: 2400,
		height: 1600,
		altText: `Photo ${n}`,
		...overrides
	});
}

/** Postgres error code of a rejected query (drizzle wraps the driver error in `cause`). */
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
const UNIQUE_VIOLATION = '23505';
const FK_VIOLATION = '23503';
const NOT_NULL_VIOLATION = '23502';

describe('library CRUD', () => {
	it('inserts, finds, updates, lists by createdAt and deletes', async () => {
		const p = await makeProperty('Library');
		const other = await makeProperty('Other');
		const a = await makeImage(p.id, { caption: 'Dawn', focalX: 0.3, focalY: 0.6 });
		const b = await makeImage(p.id);
		await makeImage(other.id);

		expect(a.caption).toBe('Dawn');
		expect([a.focalX, a.focalY]).toEqual([0.3, 0.6]);
		expect(a.storageKey).toBeNull();
		expect((await findMediaAssetById(a.id))?.url).toBe(a.url);

		const updated = await updateMediaAsset(a.id, {
			altText: 'Courtyard at dawn',
			credit: 'J. Doe'
		});
		expect(updated?.altText).toBe('Courtyard at dawn');
		expect(updated?.credit).toBe('J. Doe');
		expect((await updateMediaAsset(a.id, {}))?.id).toBe(a.id);
		expect(await updateMediaAsset(crypto.randomUUID(), { caption: 'x' })).toBeUndefined();

		expect((await listMediaAssets(p.id)).map((m) => m.id)).toEqual([a.id, b.id]);

		expect((await deleteMediaAsset(b.id))?.id).toBe(b.id);
		expect((await listMediaAssets(p.id)).map((m) => m.id)).toEqual([a.id]);
		expect(await findMediaAssetById(b.id)).toBeUndefined();
	});

	it('stores video metadata with an image poster from the same library', async () => {
		const p = await makeProperty('Video');
		const poster = await makeImage(p.id);
		const video = await makeImage(p.id, {
			kind: 'video',
			url: 'https://video.example.com/tour.mp4',
			durationSeconds: 42.5,
			posterAssetId: poster.id
		});
		expect(video.durationSeconds).toBe(42.5);
		expect(video.posterAssetId).toBe(poster.id);
	});

	it('rejects a poster from another property, a non-image poster, and a poster on an image', async () => {
		const p = await makeProperty('Poster');
		const other = await makeProperty('Elsewhere');
		const foreign = await makeImage(other.id);
		const video = { kind: 'video', url: 'https://video.example.com/a.mp4' } as const;

		await expect(makeImage(p.id, { ...video, posterAssetId: foreign.id })).rejects.toThrow(
			MediaNotInLibraryError
		);

		const clip = await makeImage(p.id, video);
		await expect(makeImage(p.id, { ...video, posterAssetId: clip.id })).rejects.toThrow(
			/must be an image/
		);
		await expect(updateMediaAsset(clip.id, { posterAssetId: foreign.id })).rejects.toThrow(
			MediaNotInLibraryError
		);

		const still = await makeImage(p.id);
		const image = await makeImage(p.id);
		expect(await pgCode(updateMediaAsset(image.id, { posterAssetId: still.id }))).toBe(
			CHECK_VIOLATION
		);
	});

	it('clears a video poster when the poster asset is deleted', async () => {
		const p = await makeProperty('Poster cleanup');
		const poster = await makeImage(p.id);
		const video = await makeImage(p.id, {
			kind: 'video',
			url: 'https://video.example.com/b.mp4',
			posterAssetId: poster.id
		});
		await deleteMediaAsset(poster.id);
		expect((await findMediaAssetById(video.id))?.posterAssetId).toBeNull();
	});
});

describe('alt-text and dimension checks', () => {
	it('rejects blank or whitespace-only alt text', async () => {
		const p = await makeProperty('Alt');
		expect(await pgCode(makeImage(p.id, { altText: '' }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(makeImage(p.id, { altText: ' \t\n ' }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(makeImage(p.id, { altText: null as never }))).toBe(NOT_NULL_VIOLATION);
	});

	it('rejects zero or negative width and height, and requires both', async () => {
		const p = await makeProperty('Dimensions');
		expect(await pgCode(makeImage(p.id, { width: 0 }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(makeImage(p.id, { height: -1 }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(makeImage(p.id, { width: null as never }))).toBe(NOT_NULL_VIOLATION);
	});

	it('rejects an out-of-range or half-set focal point, a non-http url and a non-positive duration', async () => {
		const p = await makeProperty('Other checks');
		expect(await pgCode(makeImage(p.id, { focalX: 1.2, focalY: 0.5 }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(makeImage(p.id, { focalX: 0.5 }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(makeImage(p.id, { url: 'javascript:alert(1)' }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(makeImage(p.id, { durationSeconds: 3 }))).toBe(CHECK_VIOLATION);
		expect(
			await pgCode(
				makeImage(p.id, { kind: 'video', url: 'https://v.example.com/c.mp4', durationSeconds: 0 })
			)
		).toBe(CHECK_VIOLATION);
		expect(await makeImage(p.id, { focalX: 0, focalY: 1 })).toMatchObject({ focalX: 0, focalY: 1 });
	});

	it('keeps storage_key unique', async () => {
		const p = await makeProperty('Storage');
		await makeImage(p.id, { storageKey: 'props/a.jpg' });
		expect(await pgCode(makeImage(p.id, { storageKey: 'props/a.jpg' }))).toBe(UNIQUE_VIOLATION);
	});
});

describe('property placements', () => {
	it('orders the gallery as given, dedupes, replaces, and clears', async () => {
		const p = await makeProperty('Gallery');
		const [a, b, c] = [await makeImage(p.id), await makeImage(p.id), await makeImage(p.id)];

		await setPropertyGallery(p.id, [c.id, a.id, c.id, b.id]);
		const gallery = await listPropertyMedia(p.id, 'gallery');
		expect(gallery.map((m) => m.id)).toEqual([c.id, a.id, b.id]);
		expect(gallery.map((m) => m.sortOrder)).toEqual([0, 1, 2]);
		expect(gallery[0]).toMatchObject({ role: 'gallery', altText: c.altText, width: 2400 });

		await setPropertyGallery(p.id, [b.id, a.id]);
		expect((await listPropertyMedia(p.id, 'gallery')).map((m) => m.id)).toEqual([b.id, a.id]);

		await setPropertyGallery(p.id, []);
		expect(await listPropertyMedia(p.id, 'gallery')).toHaveLength(0);
	});

	it('sets, replaces and clears a single hero, and lists hero before gallery', async () => {
		const p = await makeProperty('Hero');
		const [a, b] = [await makeImage(p.id), await makeImage(p.id)];

		await setPropertyGallery(p.id, [a.id, b.id]);
		await setPropertyHero(p.id, a.id);
		await setPropertyHero(p.id, b.id);
		expect((await listPropertyMedia(p.id, 'hero')).map((m) => m.id)).toEqual([b.id]);

		const all = await listPropertyMedia(p.id);
		expect(all.map((m) => [m.role, m.id])).toEqual([
			['hero', b.id],
			['gallery', a.id],
			['gallery', b.id]
		]);

		await setPropertyHero(p.id, null);
		expect(await listPropertyMedia(p.id, 'hero')).toHaveLength(0);
		expect(await listPropertyMedia(p.id, 'gallery')).toHaveLength(2);
	});

	it('the database allows at most one hero per property', async () => {
		const p = await makeProperty('One hero');
		const [a, b] = [await makeImage(p.id), await makeImage(p.id)];
		await setPropertyHero(p.id, a.id);
		const second = db
			.insert(propertyMedia)
			.values({ propertyId: p.id, mediaAssetId: b.id, role: 'hero', sortOrder: 1 });
		expect(await pgCode(second)).toBe(UNIQUE_VIOLATION);
	});

	it("rejects another property's asset and leaves the placements untouched", async () => {
		const p = await makeProperty('Mine');
		const other = await makeProperty('Theirs');
		const mine = await makeImage(p.id);
		const foreign = await makeImage(other.id);
		await setPropertyGallery(p.id, [mine.id]);
		await setPropertyHero(p.id, mine.id);

		await expect(setPropertyGallery(p.id, [mine.id, foreign.id])).rejects.toThrow(
			MediaNotInLibraryError
		);
		await expect(setPropertyHero(p.id, foreign.id)).rejects.toThrow(MediaNotInLibraryError);
		await expect(setPropertyGallery(p.id, [crypto.randomUUID()])).rejects.toThrow(
			MediaNotInLibraryError
		);

		expect((await listPropertyMedia(p.id)).map((m) => [m.role, m.id])).toEqual([
			['hero', mine.id],
			['gallery', mine.id]
		]);
	});

	it('the database rejects a cross-property placement written around the repository', async () => {
		const p = await makeProperty('Mine');
		const other = await makeProperty('Theirs');
		const foreign = await makeImage(other.id);
		const insert = db
			.insert(propertyMedia)
			.values({ propertyId: p.id, mediaAssetId: foreign.id, role: 'gallery' });
		expect(await pgCode(insert)).toBe(FK_VIOLATION);
	});

	it('composes inside a caller transaction and rolls back with it', async () => {
		const p = await makeProperty('Rollback');
		const a = await makeImage(p.id);
		await expect(
			db.transaction(async (tx) => {
				await setPropertyGallery(p.id, [a.id], tx);
				await setPropertyHero(p.id, a.id, tx);
				throw new Error('abort');
			})
		).rejects.toThrow('abort');
		expect(await listPropertyMedia(p.id)).toHaveLength(0);
	});
});

describe('room placements', () => {
	it('orders, replaces and clears room media', async () => {
		const p = await makeProperty('Rooms');
		const r = await insertRoom({ propertyId: p.id, name: 'Suite', ...roomBase });
		const [a, b, c] = [await makeImage(p.id), await makeImage(p.id), await makeImage(p.id)];

		await setRoomMedia(r.id, [b.id, c.id, b.id, a.id]);
		const media = await listRoomMedia(r.id);
		expect(media.map((m) => m.id)).toEqual([b.id, c.id, a.id]);
		expect(media.map((m) => m.sortOrder)).toEqual([0, 1, 2]);

		await setRoomMedia(r.id, [a.id]);
		expect((await listRoomMedia(r.id)).map((m) => m.id)).toEqual([a.id]);

		await setRoomMedia(r.id, []);
		expect(await listRoomMedia(r.id)).toHaveLength(0);
	});

	it("rejects another property's asset, and an unknown room", async () => {
		const p = await makeProperty('Mine');
		const other = await makeProperty('Theirs');
		const r = await insertRoom({ propertyId: p.id, name: 'Suite', ...roomBase });
		const mine = await makeImage(p.id);
		const foreign = await makeImage(other.id);
		await setRoomMedia(r.id, [mine.id]);

		await expect(setRoomMedia(r.id, [foreign.id])).rejects.toThrow(MediaNotInLibraryError);
		expect((await listRoomMedia(r.id)).map((m) => m.id)).toEqual([mine.id]);
		await expect(setRoomMedia(crypto.randomUUID(), [mine.id])).rejects.toThrow(/not found/);
	});

	it('the database rejects a cross-property room placement written around the repository', async () => {
		const p = await makeProperty('Mine');
		const other = await makeProperty('Theirs');
		const r = await insertRoom({ propertyId: p.id, name: 'Suite', ...roomBase });
		const foreign = await makeImage(other.id);
		// Claiming the asset's property: the room is not on it.
		const asTheirs = db
			.insert(roomMedia)
			.values({ roomId: r.id, propertyId: other.id, mediaAssetId: foreign.id });
		expect(await pgCode(asTheirs)).toBe(FK_VIOLATION);
		// Claiming the room's property: the asset is not in its library.
		const asMine = db
			.insert(roomMedia)
			.values({ roomId: r.id, propertyId: p.id, mediaAssetId: foreign.id });
		expect(await pgCode(asMine)).toBe(FK_VIOLATION);
	});
});

describe('cascades', () => {
	it('deleting an asset removes its property and room placements', async () => {
		const p = await makeProperty('Cascade asset');
		const r = await insertRoom({ propertyId: p.id, name: 'Suite', ...roomBase });
		const [a, b] = [await makeImage(p.id), await makeImage(p.id)];
		await setPropertyHero(p.id, a.id);
		await setPropertyGallery(p.id, [a.id, b.id]);
		await setRoomMedia(r.id, [a.id, b.id]);

		await deleteMediaAsset(a.id);
		expect((await listPropertyMedia(p.id)).map((m) => [m.role, m.id])).toEqual([['gallery', b.id]]);
		expect((await listRoomMedia(r.id)).map((m) => m.id)).toEqual([b.id]);
	});

	it('deleting a room removes its placements and keeps the library', async () => {
		const p = await makeProperty('Cascade room');
		const r = await insertRoom({ propertyId: p.id, name: 'Suite', ...roomBase });
		const a = await makeImage(p.id);
		await setRoomMedia(r.id, [a.id]);
		await db.delete(room).where(eq(room.id, r.id));
		expect(await db.select().from(roomMedia)).toHaveLength(0);
		expect(await listMediaAssets(p.id)).toHaveLength(1);
	});

	it('deleting a property removes its library and every placement', async () => {
		const p = await makeProperty('Doomed');
		const keep = await makeProperty('Survivor');
		const r = await insertRoom({ propertyId: p.id, name: 'Suite', ...roomBase });
		const a = await makeImage(p.id);
		const kept = await makeImage(keep.id);
		await setPropertyHero(p.id, a.id);
		await setRoomMedia(r.id, [a.id]);
		await setPropertyGallery(keep.id, [kept.id]);

		await db.delete(property).where(eq(property.id, p.id));
		expect((await db.select().from(mediaAsset)).map((m) => m.id)).toEqual([kept.id]);
		expect(await db.select().from(roomMedia)).toHaveLength(0);
		expect((await db.select().from(propertyMedia)).map((m) => m.mediaAssetId)).toEqual([kept.id]);
	});
});
