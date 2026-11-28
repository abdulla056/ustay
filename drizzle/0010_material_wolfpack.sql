CREATE TABLE "destination_slug_redirect" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"old_slug" text NOT NULL,
	"destination_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destination_slug_redirect_old_slug_unique" UNIQUE("old_slug")
);
--> statement-breakpoint
ALTER TABLE "destination_slug_redirect" ADD CONSTRAINT "destination_slug_redirect_destination_id_destination_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destination"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "destination_slug_redirect_destination_id_idx" ON "destination_slug_redirect" USING btree ("destination_id");