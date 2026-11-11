import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/test/db';
import { property, room } from '$lib/server/db/schema';
import { insertProperty } from './property.repo';
import {
	deleteRoom,
	findRoomById,
	insertRoom,
	listRoomsForProperty,
	reorderRooms,
	updateRoom
} from './room.repo';

const base = { type: 'boutique', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' } as const;
const roomBase = { maxGuests: 2, nightlyRateMinor: 15000 };

const makeProperty = (name: string) => insertProperty({ ...base, name });

describe('insertRoom', () => {
	it('auto-increments sortOrder per property', async () => {
		const a = await makeProperty('Property A');
		const b = await makeProperty('Property B');
		const a0 = await insertRoom({ propertyId: a.id, name: 'A0', ...roomBase });
		const a1 = await insertRoom({ propertyId: a.id, name: 'A1', ...roomBase });
		const b0 = await insertRoom({ propertyId: b.id, name: 'B0', ...roomBase });
		expect([a0.sortOrder, a1.sortOrder, b0.sortOrder]).toEqual([0, 1, 0]);
	});

	it('respects an explicit sortOrder, and continues after it', async () => {
		const p = await makeProperty('Property A');
		const r = await insertRoom({ propertyId: p.id, name: 'Far', sortOrder: 10, ...roomBase });
		const next = await insertRoom({ propertyId: p.id, name: 'Next', ...roomBase });
		expect(r.sortOrder).toBe(10);
		expect(next.sortOrder).toBe(11);
	});

	it('applies defaults', async () => {
		const p = await makeProperty('Property A');
		const r = await insertRoom({ propertyId: p.id, name: 'Defaults', ...roomBase });
		expect(r.unitCount).toBe(1);
		expect(r.beds).toEqual([]);
	});
});

describe('listRoomsForProperty / reorderRooms', () => {
	it('lists by sortOrder, then createdAt, scoped to the property', async () => {
		const p = await makeProperty('Property A');
		const other = await makeProperty('Property B');
		await insertRoom({ propertyId: p.id, name: 'Second', sortOrder: 1, ...roomBase });
		await insertRoom({ propertyId: p.id, name: 'First', sortOrder: 0, ...roomBase });
		await insertRoom({ propertyId: other.id, name: 'Elsewhere', ...roomBase });
		const rooms = await listRoomsForProperty(p.id);
		expect(rooms.map((r) => r.name)).toEqual(['First', 'Second']);
	});

	it('reorders rooms to the given id order', async () => {
		const p = await makeProperty('Property A');
		const [r0, r1, r2] = [
			await insertRoom({ propertyId: p.id, name: 'r0', ...roomBase }),
			await insertRoom({ propertyId: p.id, name: 'r1', ...roomBase }),
			await insertRoom({ propertyId: p.id, name: 'r2', ...roomBase })
		];
		await reorderRooms(p.id, [r2.id, r0.id, r1.id]);
		expect((await listRoomsForProperty(p.id)).map((r) => r.name)).toEqual(['r2', 'r0', 'r1']);
	});

	it("throws on another property's room id and rolls back the whole reorder", async () => {
		const p = await makeProperty('Property A');
		const other = await makeProperty('Property B');
		const mine0 = await insertRoom({ propertyId: p.id, name: 'm0', ...roomBase });
		const mine1 = await insertRoom({ propertyId: p.id, name: 'm1', ...roomBase });
		const foreign = await insertRoom({ propertyId: other.id, name: 'foreign', ...roomBase });

		await expect(reorderRooms(p.id, [mine1.id, foreign.id, mine0.id])).rejects.toThrow(
			/not found on property/
		);

		expect((await listRoomsForProperty(p.id)).map((r) => r.name)).toEqual(['m0', 'm1']);
		expect((await findRoomById(foreign.id))?.sortOrder).toBe(0);
	});
});

describe('updateRoom / deleteRoom', () => {
	it('an empty patch returns the unchanged room', async () => {
		const p = await makeProperty('Property A');
		const r = await insertRoom({ propertyId: p.id, name: 'Same', ...roomBase });
		const result = await updateRoom(r.id, {});
		expect(result).toEqual(r);
	});

	it('applies a patch', async () => {
		const p = await makeProperty('Property A');
		const r = await insertRoom({ propertyId: p.id, name: 'Before', ...roomBase });
		const updated = await updateRoom(r.id, { name: 'After', maxGuests: 4 });
		expect(updated).toMatchObject({ name: 'After', maxGuests: 4 });
	});

	it('deleteRoom removes the row; a miss is undefined', async () => {
		const p = await makeProperty('Property A');
		const r = await insertRoom({ propertyId: p.id, name: 'Gone', ...roomBase });
		expect((await deleteRoom(r.id))?.id).toBe(r.id);
		expect(await findRoomById(r.id)).toBeUndefined();
		expect(await deleteRoom(r.id)).toBeUndefined();
	});
});

describe('check constraints', () => {
	it.each([
		['max_guests of 0', { maxGuests: 0 }],
		['a negative nightly rate', { nightlyRateMinor: -1 }],
		['unit_count of 0', { unitCount: 0 }]
	])('rejects %s', async (_label, bad) => {
		const p = await makeProperty('Property A');
		await expect(
			insertRoom({ propertyId: p.id, name: 'Bad', ...roomBase, ...bad })
		).rejects.toThrow();
		expect(await listRoomsForProperty(p.id)).toHaveLength(0);
	});

	it('accepts a zero nightly rate', async () => {
		const p = await makeProperty('Property A');
		const r = await insertRoom({ propertyId: p.id, name: 'Free', ...roomBase, nightlyRateMinor: 0 });
		expect(r.nightlyRateMinor).toBe(0);
	});
});

describe('cascade', () => {
	it('deleting a property deletes its rooms', async () => {
		const p = await makeProperty('Property A');
		await insertRoom({ propertyId: p.id, name: 'One', ...roomBase });
		await insertRoom({ propertyId: p.id, name: 'Two', ...roomBase });
		await db.delete(property).where(eq(property.id, p.id));
		expect(await db.select().from(room)).toHaveLength(0);
	});
});
