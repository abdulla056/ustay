import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/test/db';
import { amenity, property, propertyAmenity, roomAmenity } from '$lib/server/db/schema';
import { insertProperty } from './property.repo';
import { insertRoom } from './room.repo';
import {
	listAmenities,
	listPropertyAmenities,
	listRoomAmenities,
	setPropertyAmenities,
	setRoomAmenities
} from './amenity.repo';

const base = { type: 'boutique', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' } as const;
const roomBase = { maxGuests: 2, nightlyRateMinor: 15000 };

/** Insert catalogue rows directly; the lane truncates tables before every test. */
async function makeAmenities(
	rows: { key: string; category: typeof amenity.$inferInsert.category; sortOrder: number }[]
) {
	const inserted = await db
		.insert(amenity)
		.values(rows.map((r) => ({ ...r, name: r.key, icon: r.key })))
		.returning();
	return Object.fromEntries(inserted.map((a) => [a.key, a.id]));
}

describe('listAmenities', () => {
	it('orders by category, then sortOrder, then name', async () => {
		await makeAmenities([
			{ key: 'zeta', category: 'services', sortOrder: 0 },
			{ key: 'pool', category: 'outdoor', sortOrder: 1 },
			{ key: 'bbq', category: 'outdoor', sortOrder: 0 },
			{ key: 'wifi', category: 'essentials', sortOrder: 5 },
			{ key: 'alpha', category: 'essentials', sortOrder: 5 }
		]);
		const keys = (await listAmenities()).map((a) => a.key);
		expect(keys).toEqual(['alpha', 'wifi', 'bbq', 'pool', 'zeta']);
	});
});

describe('setPropertyAmenities / listPropertyAmenities', () => {
	it('replaces the whole set', async () => {
		const ids = await makeAmenities([
			{ key: 'wifi', category: 'essentials', sortOrder: 0 },
			{ key: 'pool', category: 'outdoor', sortOrder: 0 },
			{ key: 'gym', category: 'wellness', sortOrder: 0 }
		]);
		const p = await insertProperty({ ...base, name: 'Replace me' });
		await setPropertyAmenities(p.id, [{ amenityId: ids.wifi }, { amenityId: ids.pool }]);
		await setPropertyAmenities(p.id, [{ amenityId: ids.gym }]);
		expect((await listPropertyAmenities(p.id)).map((a) => a.key)).toEqual(['gym']);
	});

	it('an empty set clears the property', async () => {
		const ids = await makeAmenities([{ key: 'wifi', category: 'essentials', sortOrder: 0 }]);
		const p = await insertProperty({ ...base, name: 'Clear me' });
		await setPropertyAmenities(p.id, [{ amenityId: ids.wifi }]);
		await setPropertyAmenities(p.id, []);
		expect(await listPropertyAmenities(p.id)).toHaveLength(0);
	});

	it('dedupes repeated amenity ids, keeping the last note', async () => {
		const ids = await makeAmenities([{ key: 'pool', category: 'outdoor', sortOrder: 0 }]);
		const p = await insertProperty({ ...base, name: 'Dupes' });
		await expect(
			setPropertyAmenities(p.id, [
				{ amenityId: ids.pool, note: 'first' },
				{ amenityId: ids.pool, note: 'second' }
			])
		).resolves.toBeUndefined();
		const rows = await listPropertyAmenities(p.id);
		expect(rows).toHaveLength(1);
		expect(rows[0].note).toBe('second');
	});

	it('round-trips notes, and a missing note is null', async () => {
		const ids = await makeAmenities([
			{ key: 'pool', category: 'outdoor', sortOrder: 0 },
			{ key: 'wifi', category: 'essentials', sortOrder: 0 }
		]);
		const p = await insertProperty({ ...base, name: 'Notes' });
		await setPropertyAmenities(p.id, [
			{ amenityId: ids.pool, note: 'heated, May–Sep' },
			{ amenityId: ids.wifi }
		]);
		const notes = Object.fromEntries(
			(await listPropertyAmenities(p.id)).map((a) => [a.key, a.note])
		);
		expect(notes).toEqual({ pool: 'heated, May–Sep', wifi: null });
	});

	it('composes inside a caller transaction and rolls back with it', async () => {
		const ids = await makeAmenities([{ key: 'wifi', category: 'essentials', sortOrder: 0 }]);
		const p = await insertProperty({ ...base, name: 'Rollback' });
		await expect(
			db.transaction(async (tx) => {
				await setPropertyAmenities(p.id, [{ amenityId: ids.wifi }], tx);
				throw new Error('abort');
			})
		).rejects.toThrow('abort');
		expect(await listPropertyAmenities(p.id)).toHaveLength(0);
	});

	it('deleting the property cascades to its join rows and keeps the catalogue', async () => {
		const ids = await makeAmenities([{ key: 'wifi', category: 'essentials', sortOrder: 0 }]);
		const p = await insertProperty({ ...base, name: 'Doomed' });
		await setPropertyAmenities(p.id, [{ amenityId: ids.wifi }]);
		await db.delete(property).where(eq(property.id, p.id));
		expect(await db.select().from(propertyAmenity)).toHaveLength(0);
		expect(await listAmenities()).toHaveLength(1);
	});

	it('restricts deleting an amenity that is in use', async () => {
		const ids = await makeAmenities([{ key: 'wifi', category: 'essentials', sortOrder: 0 }]);
		const p = await insertProperty({ ...base, name: 'In use' });
		await setPropertyAmenities(p.id, [{ amenityId: ids.wifi }]);
		await expect(db.delete(amenity).where(eq(amenity.id, ids.wifi))).rejects.toThrow();
		expect(await listAmenities()).toHaveLength(1);
	});
});

describe('setRoomAmenities / listRoomAmenities', () => {
	it('replaces, dedupes, round-trips notes, and clears on an empty set', async () => {
		const ids = await makeAmenities([
			{ key: 'wifi', category: 'essentials', sortOrder: 0 },
			{ key: 'bathtub', category: 'bathroom', sortOrder: 0 }
		]);
		const p = await insertProperty({ ...base, name: 'Rooms' });
		const r = await insertRoom({ propertyId: p.id, name: 'Suite', ...roomBase });

		await setRoomAmenities(r.id, [
			{ amenityId: ids.wifi, note: 'old' },
			{ amenityId: ids.wifi, note: 'new' },
			{ amenityId: ids.bathtub }
		]);
		const rows = await listRoomAmenities(r.id);
		expect(rows.map((a) => a.key)).toEqual(['wifi', 'bathtub']);
		expect(rows.map((a) => a.note)).toEqual(['new', null]);

		await setRoomAmenities(r.id, [{ amenityId: ids.bathtub }]);
		expect((await listRoomAmenities(r.id)).map((a) => a.key)).toEqual(['bathtub']);

		await setRoomAmenities(r.id, []);
		expect(await listRoomAmenities(r.id)).toHaveLength(0);
		expect(await db.select().from(roomAmenity)).toHaveLength(0);
	});
});
