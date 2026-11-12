CREATE TYPE "public"."microsite_section_type" AS ENUM('hero', 'overview', 'gallery', 'rooms', 'amenities', 'host_story', 'location', 'booking_cta');--> statement-breakpoint
CREATE TABLE "microsite_config" (
	"property_id" uuid PRIMARY KEY NOT NULL,
	"template_key" text DEFAULT 'editorial' NOT NULL,
	"accent_key" text DEFAULT 'forest' NOT NULL,
	"font_key" text DEFAULT 'editorial' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "microsite_section" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"type" "microsite_section_type" NOT NULL,
	"variant" text DEFAULT 'default' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "microsite_section_property_id_type_unique" UNIQUE("property_id","type"),
	CONSTRAINT "microsite_section_sort_order_check" CHECK ("microsite_section"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "microsite_config" ADD CONSTRAINT "microsite_config_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microsite_section" ADD CONSTRAINT "microsite_section_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;