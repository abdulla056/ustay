/**
 * Drizzle `relations()` for the application schema (UST-12).
 *
 * Kept apart from the table files so that a table file never imports another table's
 * relations: `room.schema.ts` references `property`, and `property`'s relations reference `room`.
 * Putting both relation sets here breaks that cycle. Add a new table's relations here too.
 */
import { relations } from 'drizzle-orm';
import { user } from './auth.schema';
import { amenity, propertyAmenity, roomAmenity } from './amenity.schema';
import { hostProfile } from './host.schema';
import { mediaAsset, propertyMedia, roomMedia } from './media.schema';
import { property, propertySlugRedirect } from './property.schema';
import { room } from './room.schema';

export const propertyRelations = relations(property, ({ one, many }) => ({
	owner: one(user, { fields: [property.ownerId], references: [user.id] }),
	slugRedirects: many(propertySlugRedirect),
	rooms: many(room),
	amenities: many(propertyAmenity),
	mediaAssets: many(mediaAsset),
	media: many(propertyMedia),
	hostProfile: one(hostProfile)
}));

export const hostProfileRelations = relations(hostProfile, ({ one }) => ({
	property: one(property, { fields: [hostProfile.propertyId], references: [property.id] }),
	avatar: one(mediaAsset, { fields: [hostProfile.avatarAssetId], references: [mediaAsset.id] })
}));

export const propertySlugRedirectRelations = relations(propertySlugRedirect, ({ one }) => ({
	property: one(property, { fields: [propertySlugRedirect.propertyId], references: [property.id] })
}));

export const roomRelations = relations(room, ({ one, many }) => ({
	property: one(property, { fields: [room.propertyId], references: [property.id] }),
	amenities: many(roomAmenity),
	media: many(roomMedia)
}));

export const amenityRelations = relations(amenity, ({ many }) => ({
	properties: many(propertyAmenity),
	rooms: many(roomAmenity)
}));

export const propertyAmenityRelations = relations(propertyAmenity, ({ one }) => ({
	property: one(property, { fields: [propertyAmenity.propertyId], references: [property.id] }),
	amenity: one(amenity, { fields: [propertyAmenity.amenityId], references: [amenity.id] })
}));

export const roomAmenityRelations = relations(roomAmenity, ({ one }) => ({
	room: one(room, { fields: [roomAmenity.roomId], references: [room.id] }),
	amenity: one(amenity, { fields: [roomAmenity.amenityId], references: [amenity.id] })
}));

export const mediaAssetRelations = relations(mediaAsset, ({ one, many }) => ({
	property: one(property, { fields: [mediaAsset.propertyId], references: [property.id] }),
	poster: one(mediaAsset, {
		fields: [mediaAsset.posterAssetId],
		references: [mediaAsset.id],
		relationName: 'media_asset_poster'
	}),
	posterFor: many(mediaAsset, { relationName: 'media_asset_poster' }),
	propertyPlacements: many(propertyMedia),
	roomPlacements: many(roomMedia)
}));

export const propertyMediaRelations = relations(propertyMedia, ({ one }) => ({
	property: one(property, { fields: [propertyMedia.propertyId], references: [property.id] }),
	asset: one(mediaAsset, { fields: [propertyMedia.mediaAssetId], references: [mediaAsset.id] })
}));

export const roomMediaRelations = relations(roomMedia, ({ one }) => ({
	room: one(room, { fields: [roomMedia.roomId], references: [room.id] }),
	asset: one(mediaAsset, { fields: [roomMedia.mediaAssetId], references: [mediaAsset.id] })
}));
