CREATE TYPE "public"."media_kind" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."media_role" AS ENUM('hero', 'gallery', 'thumbnail');--> statement-breakpoint
CREATE TABLE "media_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"kind" "media_kind" NOT NULL,
	"url" text NOT NULL,
	"storage_key" text,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt_text" text NOT NULL,
	"caption" text,
	"credit" text,
	"focal_x" real,
	"focal_y" real,
	"duration_seconds" real,
	"poster_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_asset_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "media_asset_property_id_id_unique" UNIQUE("property_id","id"),
	CONSTRAINT "media_asset_url_check" CHECK ("media_asset"."url" ~ '^https?://'),
	CONSTRAINT "media_asset_width_check" CHECK ("media_asset"."width" > 0),
	CONSTRAINT "media_asset_height_check" CHECK ("media_asset"."height" > 0),
	CONSTRAINT "media_asset_alt_text_check" CHECK ("media_asset"."alt_text" ~ '\S'),
	CONSTRAINT "media_asset_focal_check" CHECK (("media_asset"."focal_x" IS NULL) = ("media_asset"."focal_y" IS NULL) AND "media_asset"."focal_x" BETWEEN 0 AND 1 AND "media_asset"."focal_y" BETWEEN 0 AND 1),
	CONSTRAINT "media_asset_duration_seconds_check" CHECK ("media_asset"."duration_seconds" > 0),
	CONSTRAINT "media_asset_video_fields_check" CHECK ("media_asset"."kind" = 'video' OR ("media_asset"."duration_seconds" IS NULL AND "media_asset"."poster_asset_id" IS NULL)),
	CONSTRAINT "media_asset_poster_not_self_check" CHECK ("media_asset"."poster_asset_id" <> "media_asset"."id")
);
--> statement-breakpoint
CREATE TABLE "property_media" (
	"property_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"role" "media_role" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "property_media_media_asset_id_role_pk" PRIMARY KEY("media_asset_id","role"),
	CONSTRAINT "property_media_sort_order_check" CHECK ("property_media"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "room_media" (
	"room_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_media_room_id_media_asset_id_pk" PRIMARY KEY("room_id","media_asset_id"),
	CONSTRAINT "room_media_sort_order_check" CHECK ("room_media"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_id_property_id_unique" UNIQUE("id","property_id");--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_poster_fk" FOREIGN KEY ("property_id","poster_asset_id") REFERENCES "public"."media_asset"("property_id","id") ON DELETE set null ("poster_asset_id") ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_media_asset_fk" FOREIGN KEY ("property_id","media_asset_id") REFERENCES "public"."media_asset"("property_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_media" ADD CONSTRAINT "room_media_room_fk" FOREIGN KEY ("room_id","property_id") REFERENCES "public"."room"("id","property_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_media" ADD CONSTRAINT "room_media_media_asset_fk" FOREIGN KEY ("property_id","media_asset_id") REFERENCES "public"."media_asset"("property_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_asset_property_id_created_at_idx" ON "media_asset" USING btree ("property_id","created_at");--> statement-breakpoint
CREATE INDEX "media_asset_poster_asset_id_idx" ON "media_asset" USING btree ("poster_asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "property_media_property_id_role_sort_order_idx" ON "property_media" USING btree ("property_id","role","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "property_media_property_id_hero_idx" ON "property_media" USING btree ("property_id") WHERE "property_media"."role" = 'hero';--> statement-breakpoint
CREATE UNIQUE INDEX "room_media_room_id_sort_order_idx" ON "room_media" USING btree ("room_id","sort_order");--> statement-breakpoint
CREATE INDEX "room_media_property_id_media_asset_id_idx" ON "room_media" USING btree ("property_id","media_asset_id");