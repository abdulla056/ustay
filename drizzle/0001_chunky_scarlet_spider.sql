CREATE TABLE "room" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"max_guests" integer NOT NULL,
	"beds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nightly_rate_minor" integer NOT NULL,
	"unit_count" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_max_guests_check" CHECK ("room"."max_guests" > 0),
	CONSTRAINT "room_nightly_rate_minor_check" CHECK ("room"."nightly_rate_minor" >= 0),
	CONSTRAINT "room_unit_count_check" CHECK ("room"."unit_count" >= 1)
);
--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_property_id_sort_order_idx" ON "room" USING btree ("property_id","sort_order");