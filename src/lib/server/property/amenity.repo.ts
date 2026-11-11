/**
 * Amenity repository (UST-13). The only module that talks Drizzle about `amenity`,
 * `property_amenity` and `room_amenity`. Conventions: `docs/ARCHITECTURE.md` ("Data access /
 * repository layer") and `docs/DATABASE.md`. The executor is the last param.
 */
import { asc, eq } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { amenity, propertyAmenity, roomAmenity } from '$lib/server/db/schema';

/** One amenity to attach, with an optional free-text note. */
export type AmenityItem = { amenityId: string; note?: string | null };

const amenityOrder = [asc(amenity.category), asc(amenity.sortOrder), asc(amenity.name)];

/**
 * Collapse duplicate amenity ids. The last occurrence wins, including its note, so callers can
 * append corrections. First-seen order is kept.
 */
function dedupeItems(items: AmenityItem[]): AmenityItem[] {
	const byId = new Map<string, AmenityItem>();
	for (const item of items) {
		byId.set(item.amenityId, { amenityId: item.amenityId, note: item.note ?? null });
	}
	return [...byId.values()];
}

export async function listAmenities(tx: Executor = db) {
	return tx
		.select()
		.from(amenity)
		.orderBy(...amenityOrder);
}

export async function listPropertyAmenities(propertyId: string, tx: Executor = db) {
	return tx
		.select({
			id: amenity.id,
			key: amenity.key,
			name: amenity.name,
			category: amenity.category,
			icon: amenity.icon,
			sortOrder: amenity.sortOrder,
			note: propertyAmenity.note
		})
		.from(propertyAmenity)
		.innerJoin(amenity, eq(propertyAmenity.amenityId, amenity.id))
		.where(eq(propertyAmenity.propertyId, propertyId))
		.orderBy(...amenityOrder);
}

/**
 * Replace the property's whole amenity set. An empty `items` clears it. Runs as a savepoint when
 * called inside a transaction.
 */
export async function setPropertyAmenities(
	propertyId: string,
	items: AmenityItem[],
	tx: Executor = db
) {
	return tx.transaction(async (inner) => {
		await inner.delete(propertyAmenity).where(eq(propertyAmenity.propertyId, propertyId));
		const rows = dedupeItems(items);
		if (rows.length === 0) return;
		await inner
			.insert(propertyAmenity)
			.values(
				rows.map((item) => ({ propertyId, amenityId: item.amenityId, note: item.note ?? null }))
			);
	});
}

export async function listRoomAmenities(roomId: string, tx: Executor = db) {
	return tx
		.select({
			id: amenity.id,
			key: amenity.key,
			name: amenity.name,
			category: amenity.category,
			icon: amenity.icon,
			sortOrder: amenity.sortOrder,
			note: roomAmenity.note
		})
		.from(roomAmenity)
		.innerJoin(amenity, eq(roomAmenity.amenityId, amenity.id))
		.where(eq(roomAmenity.roomId, roomId))
		.orderBy(...amenityOrder);
}

/**
 * Replace the room's whole amenity set. An empty `items` clears it. Runs as a savepoint when
 * called inside a transaction.
 */
export async function setRoomAmenities(roomId: string, items: AmenityItem[], tx: Executor = db) {
	return tx.transaction(async (inner) => {
		await inner.delete(roomAmenity).where(eq(roomAmenity.roomId, roomId));
		const rows = dedupeItems(items);
		if (rows.length === 0) return;
		await inner
			.insert(roomAmenity)
			.values(rows.map((item) => ({ roomId, amenityId: item.amenityId, note: item.note ?? null })));
	});
}
