import { describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/test/db';
import { attraction, destination, propertyLocation, property } from '$lib/server/db/schema';
import {
	createDestination,
	deleteDestination,
	findDestinationBySlug,
	listDestinations,
	listPublishedPropertiesInDestination,
	updateDestination,
	DestinationValidationError
} from '$lib/server/destination/destination.repo';
import {
	insertMediaAsset,
	MediaNotInLibraryError,
	updateMediaAsset,
	type NewMediaAssetInput
} from './media.repo';
import { insertProperty, PropertyNotFoundError, publishProperty } from './property.repo';
import {
	deletePropertyLocation,
	DestinationNotFoundError,
	getPropertyLocation,
	LocationNotFoundError,
	LocationValidationError,
	setPropertyDestination,
	upsertPropertyLocation
} from './location.repo';
import {
	AttractionImageError,
	AttractionNotFoundError,
	AttractionOrderError,
	AttractionValidationError,
	deleteAttraction,
	insertAttraction,
	listAttractions,
	setAttractionImage,
	setAttractionOrder,
	updateAttraction
} from './attraction.repo';

const base = { type: 'boutique', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' } as const;
const makeProperty = (name: string) => insertProperty({ ...base, name });
const here = { locality: 'Cenang', countryCode: 'MY' };

let n = 0;
function makeAsset(propertyId: string, overrides: Partial<NewMediaAssetInput> = {}) {
	n += 1;
	return insertMediaAsset({
		propertyId,
		kind: 'image',
		url: `https://images.example.com/loc-${n}.jpg`,
		width: 800,
		height: 600,
		altText: `Photo ${n}`,
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

describe('property location', () => {
	it('creates, patches and reads; a second upsert updates the same row', async () => {
		const p = await makeProperty('Located');
		expect(await getPropertyLocation(p.id)).toBeUndefined();
		const created = await upsertPropertyLocation(p.id, {
			addressLine1: '  1 Jalan Pantai ',
			addressLine2: '   ',
			locality: '  Cenang ',
			countryCode: ' my ',
			latitude: 6.29,
			longitude: 99.73
		});
		expect(created.addressLine1).toBe('1 Jalan Pantai');
		expect(created.addressLine2).toBeNull();
		expect(created.locality).toBe('Cenang');
		expect(created.countryCode).toBe('MY');
		expect(created.showExactLocation).toBe(false);

		const patched = await upsertPropertyLocation(p.id, {
			showExactLocation: true,
			region: 'Kedah'
		});
		expect(patched.showExactLocation).toBe(true);
		expect(patched.latitude).toBe(6.29);
		expect(await db.select().from(propertyLocation)).toHaveLength(1);

		const cleared = await upsertPropertyLocation(p.id, { latitude: null, longitude: null });
		expect(cleared.latitude).toBeNull();
	});

	it('cascades with the property and ignores propertyId and destination in the patch', async () => {
		const p = await makeProperty('Cascade');
		const other = await makeProperty('Other');
		const d = await createDestination({ name: 'Langkawi', countryCode: 'MY' });
		const row = await upsertPropertyLocation(p.id, {
			...here,
			propertyId: other.id,
			destinationId: d.id
		} as never);
		expect(row.propertyId).toBe(p.id);
		expect(row.destinationId).toBeNull();
		expect(await getPropertyLocation(other.id)).toBeUndefined();
		await db.delete(property).where(eq(property.id, p.id));
		expect(await db.select().from(propertyLocation)).toHaveLength(0);
	});

	it('validates the coordinate pair and ranges in the repo', async () => {
		const p = await makeProperty('Coords');
		for (const bad of [
			{ latitude: 1 },
			{ longitude: 1 },
			{ latitude: 91, longitude: 0 },
			{ latitude: 0, longitude: -181 },
			{ latitude: Number.NaN, longitude: 0 },
			{ latitude: '1', longitude: 2 }
		]) {
			await expect(
				upsertPropertyLocation(p.id, { ...here, ...bad } as never)
			).rejects.toBeInstanceOf(LocationValidationError);
		}
		await upsertPropertyLocation(p.id, { ...here, latitude: 90, longitude: -180 });
		// Setting one half of the pair on its own is rejected against the stored row too.
		await expect(upsertPropertyLocation(p.id, { latitude: null })).rejects.toBeInstanceOf(
			LocationValidationError
		);
		expect((await getPropertyLocation(p.id))?.latitude).toBe(90);
	});

	it('validates required text, country code and types', async () => {
		const p = await makeProperty('Validate');
		await expect(upsertPropertyLocation(p.id, { locality: 'X' })).rejects.toBeInstanceOf(
			LocationValidationError
		);
		for (const bad of [
			{ locality: '  ' },
			{ locality: null },
			{ countryCode: 'MYS' },
			{ countryCode: 'M1' },
			{ countryCode: 5 },
			{ region: 5 },
			{ showExactLocation: 'yes' }
		]) {
			await expect(
				upsertPropertyLocation(p.id, { ...here, ...bad } as never)
			).rejects.toBeInstanceOf(LocationValidationError);
		}
		await expect(upsertPropertyLocation('nope', here)).rejects.toBeInstanceOf(
			PropertyNotFoundError
		);
		expect(await getPropertyLocation('nope')).toBeUndefined();
		expect(await deletePropertyLocation('nope')).toBeUndefined();
	});

	it('enforces the coordinate pair, range and country code in the database too', async () => {
		const p = await makeProperty('DbChecks');
		const insert = (v: Record<string, unknown>) =>
			db.insert(propertyLocation).values({ propertyId: p.id, ...here, ...v } as never);
		expect(await pgCode(insert({ latitude: 1 }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ latitude: 91, longitude: 0 }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ latitude: 0, longitude: 181 }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ countryCode: 'my' }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ locality: ' ' }))).toBe(CHECK_VIOLATION);
	});

	it('assigns, moves and clears a destination', async () => {
		const p = await makeProperty('Dest');
		const a = await createDestination({ name: 'Langkawi', countryCode: 'MY' });
		const b = await createDestination({ name: 'Penang', countryCode: 'MY' });
		await expect(setPropertyDestination(p.id, a.id)).rejects.toBeInstanceOf(LocationNotFoundError);
		await upsertPropertyLocation(p.id, here);
		expect((await setPropertyDestination(p.id, a.id)).destinationId).toBe(a.id);
		expect((await setPropertyDestination(p.id, b.id)).destinationId).toBe(b.id);
		expect((await setPropertyDestination(p.id, null)).destinationId).toBeNull();
		await expect(setPropertyDestination(p.id, crypto.randomUUID())).rejects.toBeInstanceOf(
			DestinationNotFoundError
		);
		await expect(setPropertyDestination(p.id, 'nope')).rejects.toBeInstanceOf(
			DestinationNotFoundError
		);
		await expect(setPropertyDestination('nope', a.id)).rejects.toBeInstanceOf(
			PropertyNotFoundError
		);
	});
});

describe('destination', () => {
	it('creates with a generated unique slug, finds, lists, updates and validates', async () => {
		const a = await createDestination({ name: ' Langkawi ', countryCode: 'my', region: ' ' });
		const b = await createDestination({ name: 'Langkawi', countryCode: 'MY' });
		expect(a.name).toBe('Langkawi');
		expect(a.countryCode).toBe('MY');
		expect(a.region).toBeNull();
		expect(a.slug).toBe('langkawi');
		expect(b.slug).not.toBe(a.slug);
		expect((await findDestinationBySlug('langkawi'))?.id).toBe(a.id);
		expect(await findDestinationBySlug('nope')).toBeUndefined();
		expect(await listDestinations()).toHaveLength(2);

		const patched = await updateDestination(a.id, {
			summary: 'Islands',
			slug: 'x',
			name: undefined
		} as never);
		expect(patched?.summary).toBe('Islands');
		expect(patched?.slug).toBe('langkawi');
		expect((await updateDestination(a.id, {}))?.id).toBe(a.id);
		expect(await updateDestination('nope', { name: 'X' })).toBeUndefined();
		expect(await updateDestination(crypto.randomUUID(), { name: 'X' })).toBeUndefined();

		for (const bad of [{ name: ' ' }, { name: null }, { countryCode: 'MYS' }, { summary: 5 }]) {
			await expect(updateDestination(a.id, bad as never)).rejects.toBeInstanceOf(
				DestinationValidationError
			);
		}
		await expect(createDestination({ name: 'X' } as never)).rejects.toBeInstanceOf(
			DestinationValidationError
		);
	});

	it('deleting a destination nulls the location destination but keeps the location', async () => {
		const p = await makeProperty('Keeps');
		const d = await createDestination({ name: 'Langkawi', countryCode: 'MY' });
		await upsertPropertyLocation(p.id, here);
		await setPropertyDestination(p.id, d.id);
		expect((await deleteDestination(d.id))?.id).toBe(d.id);
		const loc = await getPropertyLocation(p.id);
		expect(loc).toBeDefined();
		expect(loc?.destinationId).toBeNull();
		expect(await deleteDestination('nope')).toBeUndefined();
		expect(await db.select().from(destination)).toHaveLength(0);
	});

	it('lists only published properties in the destination', async () => {
		const d = await createDestination({ name: 'Langkawi', countryCode: 'MY' });
		const elsewhere = await createDestination({ name: 'Penang', countryCode: 'MY' });
		const pub = await makeProperty('Beta Published');
		const pub2 = await makeProperty('Alpha Published');
		const draft = await makeProperty('Draft');
		const out = await makeProperty('Other Place');
		for (const p of [pub, pub2, draft]) {
			await upsertPropertyLocation(p.id, here);
			await setPropertyDestination(p.id, d.id);
		}
		await upsertPropertyLocation(out.id, here);
		await setPropertyDestination(out.id, elsewhere.id);
		await publishProperty(pub.id);
		await publishProperty(pub2.id);
		await publishProperty(out.id);
		const listed = await listPublishedPropertiesInDestination(d.id);
		expect(listed.map((x) => x.name)).toEqual(['Alpha Published', 'Beta Published']);
		expect(await listPublishedPropertiesInDestination('nope')).toEqual([]);
	});
});

describe('attractions', () => {
	const make = (propertyId: string, name: string, extra: Record<string, unknown> = {}) =>
		insertAttraction({ propertyId, name, category: 'restaurant', ...extra } as never);

	it('appends in order, reads ordered, updates, and deletes', async () => {
		const p = await makeProperty('Picks');
		const a = await make(p.id, '  Kak Ros  ', { hostNote: " Ask for Kak Ros's nasi lemak " });
		const b = await make(p.id, 'Beach', { category: 'beach' });
		const c = await make(p.id, 'Cafe', { category: 'cafe', sortOrder: 0 });
		expect(a.name).toBe('Kak Ros');
		expect(a.hostNote).toBe("Ask for Kak Ros's nasi lemak");
		expect([a.sortOrder, b.sortOrder, c.sortOrder]).toEqual([0, 1, 0]);

		const patched = await updateAttraction(a.id, {
			hostNote: '  ',
			distanceMeters: 400,
			propertyId: crypto.randomUUID(),
			id: crypto.randomUUID(),
			name: undefined
		} as never);
		expect(patched?.hostNote).toBeNull();
		expect(patched?.distanceMeters).toBe(400);
		expect(patched?.propertyId).toBe(p.id);
		expect(patched?.id).toBe(a.id);
		expect((await updateAttraction(a.id, {}))?.name).toBe('Kak Ros');
		expect(await updateAttraction('nope', { name: 'x' })).toBeUndefined();
		expect(await updateAttraction(crypto.randomUUID(), { name: 'x' })).toBeUndefined();

		expect((await deleteAttraction(b.id))?.id).toBe(b.id);
		expect(await deleteAttraction('nope')).toBeUndefined();
		expect((await listAttractions(p.id)).map((x) => x.id)).toHaveLength(2);
		expect(await listAttractions('nope')).toEqual([]);
	});

	it('validates input with typed errors, never raw pg codes', async () => {
		const p = await makeProperty('Validate');
		await expect(insertAttraction({ propertyId: p.id, name: 'x' } as never)).rejects.toBeInstanceOf(
			AttractionValidationError
		);
		await expect(
			insertAttraction({ propertyId: crypto.randomUUID(), name: 'x', category: 'beach' })
		).rejects.toBeInstanceOf(PropertyNotFoundError);
		await expect(
			insertAttraction({ propertyId: 'nope', name: 'x', category: 'beach' })
		).rejects.toBeInstanceOf(PropertyNotFoundError);
		for (const bad of [
			{ name: ' ' },
			{ name: null },
			{ category: 'museum' },
			{ hostNote: 5 },
			{ url: 'ftp://x' },
			{ url: 'example.com' },
			{ travelMinutes: 5 },
			{ travelMode: 'walk' },
			{ travelMinutes: 0, travelMode: 'walk' },
			{ travelMinutes: 1.5, travelMode: 'walk' },
			{ travelMinutes: 5, travelMode: 'teleport' },
			{ distanceMeters: 0 },
			{ distanceMeters: -5 },
			{ latitude: 1 },
			{ latitude: 100, longitude: 0 },
			{ sortOrder: -1 }
		]) {
			await expect(make(p.id, 'Ok', bad)).rejects.toBeInstanceOf(AttractionValidationError);
		}
		const ok = await make(p.id, 'Ok', {
			travelMinutes: 10,
			travelMode: 'walk',
			url: 'https://example.com',
			latitude: 6,
			longitude: 99
		});
		// Updates are checked against the stored row.
		await expect(updateAttraction(ok.id, { travelMode: null })).rejects.toBeInstanceOf(
			AttractionValidationError
		);
		await expect(updateAttraction(ok.id, { longitude: null })).rejects.toBeInstanceOf(
			AttractionValidationError
		);
		const cleared = await updateAttraction(ok.id, { travelMinutes: null, travelMode: null });
		expect(cleared?.travelMode).toBeNull();
	});

	it('enforces the travel pair, positivity, url and coordinates in the database too', async () => {
		const p = await makeProperty('DbChecks');
		const insert = (v: Record<string, unknown>) =>
			db
				.insert(attraction)
				.values({ propertyId: p.id, name: 'x', category: 'beach', ...v } as never);
		expect(await pgCode(insert({ travelMinutes: 5 }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ travelMode: 'walk' }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ travelMinutes: 0, travelMode: 'walk' }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ distanceMeters: 0 }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ url: 'ftp://x' }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ latitude: 1 }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ latitude: 0, longitude: 200 }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ name: ' ' }))).toBe(CHECK_VIOLATION);
		expect(await pgCode(insert({ travelMinutes: 5, travelMode: 'walk' }))).toBeUndefined();
	});

	it('reorders, appends unlisted ones, and rejects other properties ids', async () => {
		const p = await makeProperty('Order');
		const q = await makeProperty('Elsewhere');
		const [a, b, c] = [await make(p.id, 'A'), await make(p.id, 'B'), await make(p.id, 'C')];
		const foreign = await make(q.id, 'Foreign');

		const ordered = await setAttractionOrder(p.id, [c.id, a.id, c.id]);
		expect(ordered.map((x) => x.id)).toEqual([c.id, a.id, b.id]);
		expect(ordered.map((x) => x.sortOrder)).toEqual([0, 1, 2]);

		await expect(setAttractionOrder(p.id, [b.id, foreign.id])).rejects.toBeInstanceOf(
			AttractionOrderError
		);
		await expect(setAttractionOrder(p.id, ['nope'])).rejects.toBeInstanceOf(AttractionOrderError);
		expect((await listAttractions(p.id)).map((x) => x.id)).toEqual([c.id, a.id, b.id]);
		expect((await listAttractions(q.id))[0].sortOrder).toBe(0);
		await expect(setAttractionOrder('nope', [])).rejects.toBeInstanceOf(PropertyNotFoundError);
	});

	it('cascades with the property', async () => {
		const p = await makeProperty('Gone');
		await make(p.id, 'A');
		await db.delete(property).where(eq(property.id, p.id));
		expect(await db.select().from(attraction)).toHaveLength(0);
	});

	it('image: same-library images only; deleting the asset nulls the column', async () => {
		const p = await makeProperty('Images');
		const q = await makeProperty('Other');
		const a = await make(p.id, 'A');
		const img = await makeAsset(p.id);
		const video = await makeAsset(p.id, {
			kind: 'video',
			width: 1920,
			height: 1080,
			durationSeconds: 5
		});
		const foreign = await makeAsset(q.id);

		expect((await setAttractionImage(a.id, img.id)).mediaAssetId).toBe(img.id);
		await expect(setAttractionImage(a.id, video.id)).rejects.toBeInstanceOf(AttractionImageError);
		await expect(setAttractionImage(a.id, foreign.id)).rejects.toBeInstanceOf(
			MediaNotInLibraryError
		);
		await expect(setAttractionImage(a.id, 'nope')).rejects.toBeInstanceOf(MediaNotInLibraryError);
		await expect(setAttractionImage('nope', img.id)).rejects.toBeInstanceOf(
			AttractionNotFoundError
		);
		await expect(setAttractionImage(crypto.randomUUID(), null)).rejects.toBeInstanceOf(
			AttractionNotFoundError
		);

		// The composite FK refuses a cross-property asset even around the repo.
		expect(
			await pgCode(
				db.update(attraction).set({ mediaAssetId: foreign.id }).where(eq(attraction.id, a.id))
			)
		).toBe(FK_VIOLATION);

		await db.execute(sql`delete from media_asset where id = ${img.id}`);
		const after = (await listAttractions(p.id))[0];
		expect(after.mediaAssetId).toBeNull();
		expect(after.propertyId).toBe(p.id);

		expect((await setAttractionImage(a.id, null)).mediaAssetId).toBeNull();
	});

	it('guards an asset that is an attraction image from changing kind', async () => {
		const p = await makeProperty('Guard');
		const a = await make(p.id, 'A');
		const img = await makeAsset(p.id);
		await setAttractionImage(a.id, img.id);
		await expect(
			updateMediaAsset(img.id, { kind: 'video', durationSeconds: 3 })
		).rejects.toBeInstanceOf(AttractionImageError);
		await setAttractionImage(a.id, null);
		expect((await updateMediaAsset(img.id, { kind: 'video', durationSeconds: 3 }))?.kind).toBe(
			'video'
		);
	});

	it('ignores the image in insert and update payloads', async () => {
		const p = await makeProperty('Strip');
		const img = await makeAsset(p.id);
		const a = await make(p.id, 'A', { mediaAssetId: img.id });
		expect(a.mediaAssetId).toBeNull();
		expect(
			(await updateAttraction(a.id, { mediaAssetId: img.id } as never))?.mediaAssetId
		).toBeNull();
	});
});
