CREATE TYPE "public"."attraction_category" AS ENUM('restaurant', 'cafe', 'beach', 'nature', 'culture', 'activity', 'shopping', 'nightlife', 'transport', 'other');--> statement-breakpoint
CREATE TYPE "public"."travel_mode" AS ENUM('walk', 'cycle', 'drive', 'boat', 'transit');--> statement-breakpoint
CREATE TABLE "attraction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "attraction_category" NOT NULL,
	"host_note" text,
	"travel_minutes" integer,
	"travel_mode" "travel_mode",
	"distance_meters" integer,
	"url" text,
	"latitude" double precision,
	"longitude" double precision,
	"media_asset_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attraction_name_check" CHECK ("attraction"."name" ~ '\S'),
	CONSTRAINT "attraction_host_note_check" CHECK ("attraction"."host_note" ~ '\S'),
	CONSTRAINT "attraction_travel_minutes_check" CHECK ("attraction"."travel_minutes" > 0),
	CONSTRAINT "attraction_distance_meters_check" CHECK ("attraction"."distance_meters" > 0),
	CONSTRAINT "attraction_travel_pair_check" CHECK (("attraction"."travel_minutes" IS NULL) = ("attraction"."travel_mode" IS NULL)),
	CONSTRAINT "attraction_url_check" CHECK ("attraction"."url" ~ '^https?://'),
	CONSTRAINT "attraction_coordinates_check" CHECK (("attraction"."latitude" IS NULL) = ("attraction"."longitude" IS NULL) AND "attraction"."latitude" BETWEEN -90 AND 90 AND "attraction"."longitude" BETWEEN -180 AND 180),
	CONSTRAINT "attraction_sort_order_check" CHECK ("attraction"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "destination" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"region" text,
	"country_code" text NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destination_slug_unique" UNIQUE("slug"),
	CONSTRAINT "destination_name_check" CHECK ("destination"."name" ~ '\S'),
	CONSTRAINT "destination_country_code_check" CHECK ("destination"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "property_location" (
	"property_id" uuid PRIMARY KEY NOT NULL,
	"address_line1" text,
	"address_line2" text,
	"locality" text NOT NULL,
	"region" text,
	"postal_code" text,
	"country_code" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"destination_id" uuid,
	"show_exact_location" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "property_location_locality_check" CHECK ("property_location"."locality" ~ '\S'),
	CONSTRAINT "property_location_country_code_check" CHECK ("property_location"."country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "property_location_coordinates_check" CHECK (("property_location"."latitude" IS NULL) = ("property_location"."longitude" IS NULL) AND "property_location"."latitude" BETWEEN -90 AND 90 AND "property_location"."longitude" BETWEEN -180 AND 180)
);
--> statement-breakpoint
ALTER TABLE "attraction" ADD CONSTRAINT "attraction_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction" ADD CONSTRAINT "attraction_media_asset_fk" FOREIGN KEY ("property_id","media_asset_id") REFERENCES "public"."media_asset"("property_id","id") ON DELETE set null ("media_asset_id") ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_location" ADD CONSTRAINT "property_location_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_location" ADD CONSTRAINT "property_location_destination_id_destination_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destination"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attraction_property_id_sort_order_idx" ON "attraction" USING btree ("property_id","sort_order");--> statement-breakpoint
CREATE INDEX "property_location_destination_id_idx" ON "property_location" USING btree ("destination_id");