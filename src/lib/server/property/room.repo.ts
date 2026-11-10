/**
 * Room repository (UST-12). The only module that talks Drizzle about `room`.
 * Conventions: `docs/ARCHITECTURE.md` ("Data access / repository layer") and `docs/DATABASE.md`.
 * No `error()` / `redirect()` here: a miss is `undefined`. The executor is the last param.
 */
import { and, asc, eq, max } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { room } from '$lib/server/db/schema';

/**
 * Input for {@link insertRoom}. The id and timestamps are assigned by the database. `sortOrder`
 * is optional: when omitted the room goes after the property's existing rooms.
 */
export type NewRoomInput = Omit<
	typeof room.$inferInsert,
	'id' | 'createdAt' | 'updatedAt' | 'sortOrder'
> & { sortOrder?: number };

export async function listRoomsForProperty(propertyId: string, tx: Executor = db) {
	return tx
		.select()
		.from(room)
		.where(eq(room.propertyId, propertyId))
		.orderBy(asc(room.sortOrder), asc(room.createdAt));
}

export async function findRoomById(id: string, tx: Executor = db) {
	const [row] = await tx.select().from(room).where(eq(room.id, id)).limit(1);
	return row;
}

export async function insertRoom(input: NewRoomInput, tx: Executor = db) {
	let sortOrder = input.sortOrder;
	if (sortOrder === undefined) {
		const [{ current }] = await tx
			.select({ current: max(room.sortOrder).mapWith(Number) })
			.from(room)
			.where(eq(room.propertyId, input.propertyId));
		sortOrder = current === null || Number.isNaN(current) ? 0 : current + 1;
	}
	const [row] = await tx
		.insert(room)
		.values({ ...input, sortOrder })
		.returning();
	return row;
}

export async function updateRoom(
	id: string,
	patch: Partial<Omit<NewRoomInput, 'propertyId'>>,
	tx: Executor = db
) {
	if (Object.keys(patch).length === 0) return findRoomById(id, tx);
	const [row] = await tx.update(room).set(patch).where(eq(room.id, id)).returning();
	return row;
}

export async function deleteRoom(id: string, tx: Executor = db) {
	const [row] = await tx.delete(room).where(eq(room.id, id)).returning();
	return row;
}

/**
 * Set `sort_order` to each id's position in `orderedIds`, in one transaction. The `where` includes
 * `propertyId`, so an id from another property is never reordered. If any id fails to update, the
 * transaction rolls back and this throws.
 */
export async function reorderRooms(propertyId: string, orderedIds: string[]) {
	return db.transaction(async (tx) => {
		for (const [index, id] of orderedIds.entries()) {
			const [row] = await tx
				.update(room)
				.set({ sortOrder: index })
				.where(and(eq(room.id, id), eq(room.propertyId, propertyId)))
				.returning({ id: room.id });
			if (!row) throw new Error(`Room ${id} not found on property ${propertyId}`);
		}
	});
}
