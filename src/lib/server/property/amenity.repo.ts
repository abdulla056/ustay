/**
 * Amenity repository (UST-13). The only module that talks Drizzle about `amenity`,
 * `property_amenity` and `room_amenity`. Conventions: `docs/ARCHITECTURE.md` ("Data access /
 * repository layer") and `docs/DATABASE.md`. The executor is the last param.
 */
import { asc, eq } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { amenity, propertyAmenity, roomAmenity } from '$lib/server/db/schema';

const amenityOrder = [asc(amenity.category), asc(amenity.sortOrder), asc(amenity.name)];

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

/** Replace the property's whole amenity set in one transaction. */
export async function setPropertyAmenities(
	propertyId: string,
	items: { amenityId: string; note?: string | null }[]
) {
	return db.transaction(async (tx) => {
		await tx.delete(propertyAmenity).where(eq(propertyAmenity.propertyId, propertyId));
		if (items.length === 0) return;
		await tx.insert(propertyAmenity).values(
			items.map((item) => ({
				propertyId,
				amenityId: item.amenityId,
				note: item.note ?? null
			}))
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
			sortOrder: amenity.sortOrder
		})
		.from(roomAmenity)
		.innerJoin(amenity, eq(roomAmenity.amenityId, amenity.id))
		.where(eq(roomAmenity.roomId, roomId))
		.orderBy(...amenityOrder);
}

/** Replace the room's whole amenity set in one transaction. */
export async function setRoomAmenities(roomId: string, amenityIds: string[]) {
	return db.transaction(async (tx) => {
		await tx.delete(roomAmenity).where(eq(roomAmenity.roomId, roomId));
		if (amenityIds.length === 0) return;
		await tx.insert(roomAmenity).values(amenityIds.map((amenityId) => ({ roomId, amenityId })));
	});
}
