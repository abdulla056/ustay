CREATE TYPE "public"."amenity_category" AS ENUM('essentials', 'bathroom', 'kitchen', 'outdoor', 'wellness', 'family', 'accessibility', 'services');--> statement-breakpoint
CREATE TABLE "amenity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"category" "amenity_category" NOT NULL,
	"icon" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amenity_key_unique" UNIQUE("key"),
	CONSTRAINT "amenity_key_check" CHECK ("amenity"."key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "property_amenity" (
	"property_id" uuid NOT NULL,
	"amenity_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "property_amenity_property_id_amenity_id_pk" PRIMARY KEY("property_id","amenity_id")
);
--> statement-breakpoint
CREATE TABLE "room_amenity" (
	"room_id" uuid NOT NULL,
	"amenity_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_amenity_room_id_amenity_id_pk" PRIMARY KEY("room_id","amenity_id")
);
--> statement-breakpoint
ALTER TABLE "property_amenity" ADD CONSTRAINT "property_amenity_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_amenity" ADD CONSTRAINT "property_amenity_amenity_id_amenity_id_fk" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenity"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_amenity" ADD CONSTRAINT "room_amenity_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_amenity" ADD CONSTRAINT "room_amenity_amenity_id_amenity_id_fk" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenity"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "amenity_category_sort_order_idx" ON "amenity" USING btree ("category","sort_order");--> statement-breakpoint
CREATE INDEX "property_amenity_amenity_id_idx" ON "property_amenity" USING btree ("amenity_id");--> statement-breakpoint
CREATE INDEX "room_amenity_amenity_id_idx" ON "room_amenity" USING btree ("amenity_id");