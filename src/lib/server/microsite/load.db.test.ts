import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, testDatabaseUrl } from '$lib/server/test/db';
import { createSeedAuth, createSeedDb } from '$lib/server/db/seed/client';
import { seedDevUser } from '$lib/server/db/seed/dev-user';
import { seedAmenities } from '$lib/server/db/seed/amenities';
import { SAMPLE_PROPERTY_SLUG, seedSampleProperty } from '$lib/server/db/seed/sample-property';
import {
	attraction,
	hostProfile,
	micrositeSection,
	property,
	propertyAmenity,
	propertyLocation,
	review,
	room
} from '$lib/server/db/schema';
import { TEMPLATES } from '$lib/features/microsite/registry';
import { getPropertyLocation } from '$lib/server/property/location.repo';
import { findPropertyBySlug, renameProperty } from '$lib/server/property/property.repo';
import { createImportedReview, publishReview } from '$lib/server/review/review.repo';
import { loadMicrosite } from './load';

const seed = createSeedDb(testDatabaseUrl());
afterAll(() => seed.close());

beforeEach(async () => {
	await seedDevUser(seed.db, createSeedAuth(seed.db));
	await seedAmenities(seed.db);
	await seedSampleProperty(seed.db);
});

async function loadOk(slug = SAMPLE_PROPERTY_SLUG) {
	const result = await loadMicrosite(slug);
	if (result.kind !== 'ok') throw new Error(`expected ok, got ${result.kind}`);
	return result.view;
}

const sampleId = async () => (await findPropertyBySlug(SAMPLE_PROPERTY_SLUG))!.id;

describe('loadMicrosite', () => {
	it('loads Rumah Kabus with the template section order and the zoom gallery', async () => {
		const view = await loadOk();
		const editorial = TEMPLATES.find((t) => t.key === 'editorial')!;
		expect(view.sections.map((s) => s.type)).toEqual(editorial.sections.map((s) => s.type));
		const gallery = view.sections.find((s) => s.type === 'gallery')!;
		expect(gallery.variant).toBe('zoom');
		expect(view.property.name).toBe('Rumah Kabus');
		expect(view.seo.canonicalPath).toBe('/s/rumah-kabus');
		expect(view.seo.title).toBe('Rumah Kabus · A tea planter’s house above the cloud line.');
		expect(view.seo.image?.src).toMatch(/^\/prototype\//);
		expect(view.seo.priceRange).toMatch(/-/);
		expect(view.theme.accentKey).toBe('forest');
	});

	it('attaches each room its own image and amenities (batched reads)', async () => {
		const view = await loadOk();
		const rooms = view.sections.find((s) => s.type === 'rooms')!;
		if (rooms.type !== 'rooms') throw new Error('unreachable');
		expect(rooms.data.rooms.length).toBeGreaterThan(1);
		const cta = view.sections.find((s) => s.type === 'booking_cta');
		if (cta?.type !== 'booking_cta') throw new Error('missing booking_cta');
		expect(cta.data.rooms.map((r) => r.name)).toEqual(rooms.data.rooms.map((r) => r.name));
		expect(rooms.data.rooms.every((r) => r.image !== null)).toBe(true);
		expect(rooms.data.rooms.every((r) => r.images[0]?.src === r.image?.src)).toBe(true);
		expect(rooms.data.rooms.some((r) => r.images.length > 1)).toBe(true);
		expect(rooms.data.rooms.some((r) => r.amenities.length > 0)).toBe(true);
		const location = view.sections.find((s) => s.type === 'location')!;
		const hero = view.sections.find((s) => s.type === 'hero')!;
		if (location.type !== 'location' || hero.type !== 'hero') throw new Error('unreachable');
		expect(hero.data.locationLabel).toBe(location.data.place?.label);
		expect(hero.data.bookingAnchor).toBe('#booking');
	});

	it('renders the story and host bio as HTML on the server', async () => {
		const view = await loadOk();
		const hostStory = view.sections.find((s) => s.type === 'host_story')!;
		if (hostStory.type !== 'host_story') throw new Error('unreachable');
		expect(hostStory.data.story?.body.html).toContain('<p>');
		expect(hostStory.data.host?.bio?.html).toContain('<p>');
	});

	it('exposes the public location only: no address lines, no exact coordinates', async () => {
		const view = await loadOk();
		const full = (await getPropertyLocation(await sampleId()))!;
		expect(full.addressLine1).toBeTruthy(); // the seed has a real address to leak
		const location = view.sections.find((s) => s.type === 'location')!;
		if (location.type !== 'location') throw new Error('unreachable');
		expect(location.data.place?.exact).toBe(false);
		expect(location.data.place?.addressLines).toEqual([]);
		const json = JSON.stringify(view);
		expect(json).not.toContain(full.addressLine1!);
		expect(json).not.toContain(String(full.latitude));
		expect(json).not.toContain(String(full.longitude));
	});

	it('gives attractions their exact coordinates (public places), not the property', async () => {
		const view = await loadOk();
		const location = view.sections.find((s) => s.type === 'location')!;
		if (location.type !== 'location') throw new Error('unreachable');
		const withCoords = location.data.attractions.filter((a) => a.latitude !== null);
		expect(withCoords.length).toBeGreaterThan(0);
		for (const a of withCoords) {
			expect(typeof a.latitude).toBe('number');
			expect(typeof a.longitude).toBe('number');
		}
	});

	it('coarsens attraction distances while the location is hidden (500 m, 1 km floor)', async () => {
		const view = await loadOk();
		const location = view.sections.find((s) => s.type === 'location')!;
		if (location.type !== 'location') throw new Error('unreachable');
		const distances = location.data.attractions.flatMap((a) =>
			a.distanceMeters === null ? [] : [a.distanceMeters]
		);
		expect(distances.length).toBeGreaterThan(0);
		for (const d of distances) {
			expect(d % 500).toBe(0);
			expect(d).toBeGreaterThanOrEqual(1000);
		}
	});

	it('carries no ids, owner, emails or token data', async () => {
		const json = JSON.stringify(await loadOk());
		for (const key of ['ownerId', 'propertyId', 'tokenHash', 'guestEmail', 'email', '"id"']) {
			expect(json).not.toContain(key);
		}
	});

	it('excludes pending reviews and labels imported ones once published', async () => {
		const id = await sampleId();
		const before = await loadOk();
		const overviewBefore = before.sections.find((s) => s.type === 'overview')!;
		if (overviewBefore.type !== 'overview') throw new Error('unreachable');
		const countBefore = overviewBefore.data.reviews?.summary.count ?? 0;

		const pending = await createImportedReview(id, {
			origin: 'Tripzilla',
			rating: 5,
			body: 'Pending review body that must not show.',
			authorName: 'Pending P.'
		});
		const during = await loadOk();
		expect(JSON.stringify(during)).not.toContain('Pending review body');

		await publishReview(pending.id);
		const after = await loadOk();
		const overviewAfter = after.sections.find((s) => s.type === 'overview')!;
		if (overviewAfter.type !== 'overview') throw new Error('unreachable');
		expect(overviewAfter.data.reviews?.summary.count).toBe(countBefore + 1);
		const shown = overviewAfter.data.reviews?.items.find((r) => r.authorName === 'Pending P.');
		expect(shown).toMatchObject({ source: 'imported', origin: 'Tripzilla' });
	});

	it('returns not_found for an unknown slug and for a draft', async () => {
		expect((await loadMicrosite('no-such-place')).kind).toBe('not_found');
		await db
			.update(property)
			.set({ status: 'draft' })
			.where(eq(property.slug, SAMPLE_PROPERTY_SLUG));
		expect((await loadMicrosite(SAMPLE_PROPERTY_SLUG)).kind).toBe('not_found');
	});

	it('does not leak an archived property either', async () => {
		await db
			.update(property)
			.set({ status: 'archived' })
			.where(eq(property.slug, SAMPLE_PROPERTY_SLUG));
		expect((await loadMicrosite(SAMPLE_PROPERTY_SLUG)).kind).toBe('not_found');
	});

	it('redirects a renamed slug to the current one', async () => {
		await renameProperty(await sampleId(), 'Rumah Kabus Highlands');
		const result = await loadMicrosite(SAMPLE_PROPERTY_SLUG);
		expect(result).toEqual({ kind: 'redirect', slug: 'rumah-kabus-highlands' });
		expect((await loadMicrosite('rumah-kabus-highlands')).kind).toBe('ok');
	});

	it('is not_found for an old slug whose property is now a draft', async () => {
		const id = await sampleId();
		await renameProperty(id, 'Rumah Kabus Highlands');
		await db.update(property).set({ status: 'draft' }).where(eq(property.id, id));
		expect((await loadMicrosite(SAMPLE_PROPERTY_SLUG)).kind).toBe('not_found');
	});

	it('drops sections whose data is empty, keeps hero and booking_cta', async () => {
		const id = await sampleId();
		await db.delete(room).where(eq(room.propertyId, id));
		await db.delete(propertyAmenity).where(eq(propertyAmenity.propertyId, id));
		await db.delete(attraction).where(eq(attraction.propertyId, id));
		await db.delete(propertyLocation).where(eq(propertyLocation.propertyId, id));
		await db.delete(hostProfile).where(eq(hostProfile.propertyId, id));
		await db
			.update(property)
			.set({ storyBody: null, storyHeading: null })
			.where(eq(property.id, id));
		const view = await loadOk();
		expect(view.sections.map((s) => s.type)).toEqual([
			'hero',
			'overview',
			'gallery',
			'booking_cta'
		]);
		const cta = view.sections.at(-1)!;
		if (cta.type !== 'booking_cta') throw new Error('unreachable');
		expect(cta.data.fromPrice).toBeNull();
		expect(cta.data.rooms).toEqual([]);
		expect(view.seo.priceRange).toBeNull();
		expect(view.seo.address).toBeNull();
	});

	it('skips a disabled section', async () => {
		const id = await sampleId();
		await db
			.update(micrositeSection)
			.set({ enabled: false })
			.where(eq(micrositeSection.propertyId, id));
		await db
			.update(micrositeSection)
			.set({ enabled: true })
			.where(eq(micrositeSection.type, 'hero'));
		expect((await loadOk()).sections.map((s) => s.type)).toEqual(['hero']);
	});

	it('shows published guest reviews only (review table is not exposed raw)', async () => {
		const rows = await db.select().from(review).where(eq(review.status, 'pending'));
		const view = await loadOk();
		for (const r of rows) expect(JSON.stringify(view)).not.toContain(r.body);
	});
});
