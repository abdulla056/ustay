/**
 * Drizzle `relations()` for the application schema (UST-12).
 *
 * Kept apart from the table files so that a table file never imports another table's
 * relations: `room.schema.ts` references `property`, and `property`'s relations reference `room`.
 * Putting both relation sets here breaks that cycle. Add a new table's relations here too.
 */
import { relations } from 'drizzle-orm';
import { user } from './auth.schema';
import { property, propertySlugRedirect } from './property.schema';
import { room } from './room.schema';

export const propertyRelations = relations(property, ({ one, many }) => ({
	owner: one(user, { fields: [property.ownerId], references: [user.id] }),
	slugRedirects: many(propertySlugRedirect),
	rooms: many(room)
	// Child entities (amenities) add their `many()` here as their tables land.
}));

export const propertySlugRedirectRelations = relations(propertySlugRedirect, ({ one }) => ({
	property: one(property, { fields: [propertySlugRedirect.propertyId], references: [property.id] })
}));

export const roomRelations = relations(room, ({ one }) => ({
	property: one(property, { fields: [room.propertyId], references: [property.id] })
	// photos: many(roomPhoto) — added by the media issue
}));
