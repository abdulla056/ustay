CREATE TABLE "host_profile" (
	"property_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"avatar_asset_id" uuid,
	"hosting_since" integer,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "host_profile_display_name_check" CHECK ("host_profile"."display_name" ~ '\S'),
	CONSTRAINT "host_profile_bio_check" CHECK ("host_profile"."bio" ~ '\S'),
	CONSTRAINT "host_profile_hosting_since_check" CHECK ("host_profile"."hosting_since" >= 1900)
);
--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "story_heading" text;--> statement-breakpoint
ALTER TABLE "property" ADD COLUMN "story_body" text;--> statement-breakpoint
ALTER TABLE "host_profile" ADD CONSTRAINT "host_profile_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_profile" ADD CONSTRAINT "host_profile_avatar_fk" FOREIGN KEY ("property_id","avatar_asset_id") REFERENCES "public"."media_asset"("property_id","id") ON DELETE set null ("avatar_asset_id") ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property" ADD CONSTRAINT "property_story_heading_check" CHECK ("property"."story_heading" ~ '\S');--> statement-breakpoint
ALTER TABLE "property" ADD CONSTRAINT "property_story_body_check" CHECK ("property"."story_body" ~ '\S');