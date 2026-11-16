import { afterAll, describe, expect, it } from 'vitest';
import { createSeedAuth, createSeedDb } from './client';
import { DEV_USER_EMAIL, DEV_USER_PASSWORD } from './dev-user';
import { seedModules } from './index';
import { user } from '../schema';
import * as schema from '../schema';
import { SAMPLE_PROPERTY_SLUG, seedSampleProperty } from './sample-property';
import { todayInZone } from '$lib/server/booking/lifecycle';
import { getPropertyLocation } from '$lib/server/property/location.repo';
import { findPropertyBySlug } from '$lib/server/property/property.repo';
import { getRenderableMicrosite } from '$lib/server/microsite/microsite.repo';
import { getPublicPropertyLocation } from '$lib/server/property/location.repo';
import { listPropertyMedia, listRoomMedia } from '$lib/server/property/media.repo';
import { getHostProfile } from '$lib/server/property/host.repo';
import { listAttractions } from '$lib/server/property/attraction.repo';
import { getRatingSummary, listReviews } from '$lib/server/review/review.repo';
import { listBookingRequests, listMessages } from '$lib/server/booking/booking.repo';
import { listRoomsForProperty } from '$lib/server/property/room.repo';
import { listPropertyAmenities, listRoomAmenities } from '$lib/server/property/amenity.repo';
import { eq, getTableName, isTable } from 'drizzle-orm';
import { testDatabaseUrl } from '$lib/server/test/db';

// The seed modules run exactly as `bun run db:seed` runs them (same client, same auth instance),
// only against the guarded `ustay_test` URL.
const seed = createSeedDb(testDatabaseUrl());
const auth = createSeedAuth(seed.db);
afterAll(() => seed.close());

async function runAll() {
	const results = [];
	for (const m of seedModules) results.push(await m.run({ db: seed.db, auth }));
	return results;
}

describe('seed modules', () => {
	it('create on a fresh database, then skip on the second run (idempotent)', async () => {
		const first = await runAll();
		expect(first.every((r) => r.created)).toBe(true);
		const usersAfterFirst = await seed.db.select().from(user);

		const second = await runAll();
		expect(second.every((r) => !r.created)).toBe(true);
		expect(await seed.db.select().from(user)).toEqual(usersAfterFirst);
	});

	it('leaves a dev user who can sign in through better-auth', async () => {
		await runAll();
		const res = await auth.api.signInEmail({
			body: { email: DEV_USER_EMAIL, password: DEV_USER_PASSWORD }
		});
		expect(res.user.email).toBe(DEV_USER_EMAIL);
		expect(res.token).toBeTruthy();
	});

	it('rejects a wrong password', async () => {
		await runAll();
		await expect(
			auth.api.signInEmail({ body: { email: DEV_USER_EMAIL, password: 'wrong-password' } })
		).rejects.toThrow();
	});
});

describe('sample property (UST-20)', () => {
	async function sample() {
		await runAll();
		const property = await findPropertyBySlug(SAMPLE_PROPERTY_SLUG);
		expect(property).toBeDefined();
		return property!;
	}

	async function rowCounts() {
		const counts: Record<string, number> = {};
		for (const table of Object.values(schema)) {
			if (!isTable(table)) continue;
			counts[getTableName(table)] = (await seed.db.select().from(table)).length;
		}
		return counts;
	}

	it('is published, owned by the dev user, in MYR and the Kuala Lumpur timezone', async () => {
		const property = await sample();
		expect(property).toMatchObject({
			status: 'published',
			currency: 'MYR',
			timezone: 'Asia/Kuala_Lumpur'
		});
		expect(property.publishedAt).not.toBeNull();
		expect(property.storyBody).toBeTruthy();
		const [owner] = await seed.db.select().from(user);
		expect(property.ownerId).toBe(owner.id);
	});

	it('renders the editorial microsite: 8 enabled sections, zoom gallery, forest accent', async () => {
		const property = await sample();
		const microsite = await getRenderableMicrosite(property.id);
		expect(microsite?.sections).toHaveLength(8);
		expect(microsite?.sections.find((s) => s.type === 'gallery')?.variant).toBe('zoom');
		expect(microsite?.accent.key).toBe('forest');
	});

	it('exposes a coarsened, address-free public location', async () => {
		const property = await sample();
		const location = await getPublicPropertyLocation(property.id);
		expect(location).toMatchObject({ locality: 'Ringlet', countryCode: 'MY' });
		expect(location).not.toHaveProperty('addressLine1');
		expect(location).not.toHaveProperty('postalCode');
		expect(location?.showExactLocation).toBe(false);
		expect(location?.latitude).toBe(4.42);
		expect(location?.longitude).toBe(101.38);
	});

	it('has a hero, a gallery of at least 6, a thumbnail, and an image avatar', async () => {
		const property = await sample();
		expect(await listPropertyMedia(property.id, 'hero')).toHaveLength(1);
		const gallery = await listPropertyMedia(property.id, 'gallery');
		expect(gallery.length).toBeGreaterThanOrEqual(6);
		expect(gallery.map((g) => g.sortOrder)).toEqual(gallery.map((_, i) => i));
		expect(await listPropertyMedia(property.id, 'thumbnail')).toHaveLength(1);
		for (const item of await listPropertyMedia(property.id)) {
			expect(item.url).toMatch(/^\/prototype\/[\w-]+\.jpg$/);
			expect(item.altText.trim()).not.toBe('');
		}
		const host = await getHostProfile(property.id);
		expect(host?.languages).toEqual(['en', 'ms']);
		const avatar = (await seed.db.select().from(schema.mediaAsset)).find(
			(a) => a.id === host?.avatarAssetId
		);
		expect(avatar?.kind).toBe('image');
	});

	it('has 4 rooms with media and amenities, and amenities with notes on the property', async () => {
		const property = await sample();
		const rooms = await listRoomsForProperty(property.id);
		expect(rooms).toHaveLength(4);
		for (const r of rooms) {
			expect((await listRoomMedia(r.id)).length).toBeGreaterThan(0);
			expect((await listRoomAmenities(r.id)).length).toBeGreaterThan(0);
		}
		const amenities = await listPropertyAmenities(property.id);
		expect(amenities.length).toBeGreaterThan(5);
		expect(amenities.some((a) => a.note)).toBe(true);
	});

	it('lists its attractions in order', async () => {
		const property = await sample();
		const attractions = await listAttractions(property.id);
		expect(attractions.length).toBeGreaterThanOrEqual(6);
		expect(attractions.map((a) => a.sortOrder)).toEqual(attractions.map((_, i) => i));
		expect(attractions.every((a) => a.hostNote)).toBe(true);
		expect(attractions.some((a) => a.mediaAssetId)).toBe(true);
	});

	it('counts only published reviews, with a believable average', async () => {
		const property = await sample();
		const summary = await getRatingSummary(property.id);
		expect(summary).toMatchObject({ count: 6, guestCount: 4, importedCount: 2 });
		expect(summary.average).toBe(4.7);
		const published = await listReviews(property.id);
		expect(published.items).toHaveLength(6);
		expect(published.items.every((r) => r.status === 'published')).toBe(true);
		expect(published.items.some((r) => r.hostReply)).toBe(true);
		expect(published.items.filter((r) => r.source === 'imported').every((r) => r.origin)).toBe(
			true
		);
		for (const r of published.items) expect(r.authorName).not.toContain('@');
		const queue = await listReviews(property.id, { status: 'pending' });
		expect(queue.items).toHaveLength(1);
	});

	it('has an inbox with one pending booking and one question, each with a thread', async () => {
		const property = await sample();
		const bookings = await listBookingRequests(property.id, { status: 'pending', kind: 'booking' });
		const questions = await listBookingRequests(property.id, {
			status: 'pending',
			kind: 'question'
		});
		expect(bookings).toHaveLength(1);
		expect(questions).toHaveLength(1);
		expect(bookings[0].estimatedTotalMinor).toBe(bookings[0].nightlyRateMinor! * 3);
		expect(bookings[0].guestEmail).toBe(bookings[0].guestEmail.toLowerCase());
		expect((await listMessages(bookings[0].id)).length).toBeGreaterThan(1);
		expect((await listMessages(questions[0].id)).length).toBeGreaterThan(1);
	});

	it('places attractions at distances that fit their travel times', async () => {
		const property = await sample();
		const home = await getPropertyLocation(property.id);
		const metres = (lat: number, lng: number) => {
			const rad = Math.PI / 180;
			const dLat = (lat - home!.latitude!) * rad;
			const dLng = (lng - home!.longitude!) * rad;
			const a =
				Math.sin(dLat / 2) ** 2 +
				Math.cos(home!.latitude! * rad) * Math.cos(lat * rad) * Math.sin(dLng / 2) ** 2;
			return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
		};
		const attractions = await listAttractions(property.id);
		const distances = attractions.map((a) => metres(a.latitude!, a.longitude!));
		for (const [i, a] of attractions.entries()) {
			const d = distances[i];
			if (a.travelMode === 'walk') {
				expect(d).toBeGreaterThan(a.travelMinutes! * 30);
				expect(d).toBeLessThan(a.travelMinutes! * 80);
			} else if (a.travelMode === 'drive') {
				expect(d).toBeGreaterThan(a.travelMinutes! * 250);
				expect(d).toBeLessThan(a.travelMinutes! * 600);
			} else {
				// By distance only: the straight line cannot exceed the stated road distance.
				expect(d).toBeLessThanOrEqual(a.distanceMeters!);
				expect(d).toBeGreaterThan(a.distanceMeters! * 0.9);
			}
		}
		expect(distances.filter((d) => d > 100).length).toBe(distances.length);
	});

	it('refreshes only the inbox when its fixtures go stale (injected clock)', async () => {
		const property = await sample();
		const before = await rowCounts();
		const reviewsBefore = await seed.db.select().from(schema.review);
		const inboxBefore = await listBookingRequests(property.id, { status: 'pending' });
		expect(inboxBefore).toHaveLength(2);

		// Within the 72 hour window nothing is stale.
		const soon = new Date(Date.now() + 24 * 3_600_000);
		expect(await seedSampleProperty(seed.db, soon)).toMatchObject({ created: false });
		expect((await seedSampleProperty(seed.db, soon)).refreshed).toBeUndefined();

		// Four days on, both have expired: they are recreated, relative to the new "now".
		const later = new Date(Date.now() + 4 * 86_400_000);
		const result = await seedSampleProperty(seed.db, later);
		expect(result).toMatchObject({ created: false, refreshed: true });
		const inbox = await listBookingRequests(property.id, { status: 'pending' });
		expect(inbox).toHaveLength(2);
		expect(inbox.map((r) => r.id)).not.toContain(inboxBefore[0].id);
		for (const request of inbox)
			expect(request.expiresAt.getTime()).toBeGreaterThan(later.getTime());
		const booking = inbox.find((r) => r.kind === 'booking')!;
		const expectedCheckIn = new Date(
			Date.parse(`${todayInZone('Asia/Kuala_Lumpur', later)}T00:00:00Z`) + 35 * 86_400_000
		)
			.toISOString()
			.slice(0, 10);
		expect(booking.checkIn).toBe(expectedCheckIn);
		expect(booking.estimatedTotalMinor).toBe(booking.nightlyRateMinor! * 3);
		expect(await listMessages(booking.id)).toHaveLength(2);

		// Nothing else moved, and an immediate re-run is a plain skip.
		expect(await rowCounts()).toEqual(before);
		expect(await seed.db.select().from(schema.review)).toEqual(reviewsBefore);
		expect((await seedSampleProperty(seed.db, later)).refreshed).toBeUndefined();
	});

	it('also refreshes when the question was closed', async () => {
		const property = await sample();
		const [question] = await listBookingRequests(property.id, { kind: 'question' });
		await seed.db
			.update(schema.bookingRequest)
			.set({ status: 'closed', respondedAt: new Date() })
			.where(eq(schema.bookingRequest.id, question.id));
		expect(await seedSampleProperty(seed.db)).toMatchObject({ created: false, refreshed: true });
		expect(
			await listBookingRequests(property.id, { status: 'pending', kind: 'question' })
		).toHaveLength(1);
	});

	it('skips on a second run and leaves every row count unchanged', async () => {
		await runAll();
		const before = await rowCounts();
		const second = await runAll();
		expect(second.every((r) => !r.created)).toBe(true);
		expect(await rowCounts()).toEqual(before);
	});
});
