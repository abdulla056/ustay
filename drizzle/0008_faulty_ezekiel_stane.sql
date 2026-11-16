CREATE TYPE "public"."review_source" AS ENUM('guest', 'imported');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'published', 'rejected');--> statement-breakpoint
CREATE TABLE "review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"source" "review_source" NOT NULL,
	"booking_request_id" uuid,
	"origin" text,
	"rating" smallint NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"author_name" text NOT NULL,
	"author_user_id" text,
	"stayed_on" date,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"moderated_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"host_reply" text,
	"host_replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_booking_request_id_unique" UNIQUE("booking_request_id"),
	CONSTRAINT "review_rating_check" CHECK ("review"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "review_body_check" CHECK ("review"."body" ~ '\S'),
	CONSTRAINT "review_author_name_check" CHECK ("review"."author_name" ~ '\S'),
	CONSTRAINT "review_title_check" CHECK ("review"."title" ~ '\S'),
	CONSTRAINT "review_source_check" CHECK (("review"."source" = 'guest' AND "review"."origin" IS NULL)
				OR ("review"."source" = 'imported' AND "review"."origin" IS NOT NULL AND "review"."origin" ~ '\S' AND "review"."booking_request_id" IS NULL)),
	CONSTRAINT "review_host_reply_check" CHECK (("review"."host_reply" IS NULL) = ("review"."host_replied_at" IS NULL) AND "review"."host_reply" ~ '\S'),
	CONSTRAINT "review_published_at_check" CHECK (("review"."status" = 'published') = ("review"."published_at" IS NOT NULL)),
	CONSTRAINT "review_moderated_at_check" CHECK (("review"."status" = 'pending') = ("review"."moderated_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_booking_request_id_booking_request_id_fk" FOREIGN KEY ("booking_request_id") REFERENCES "public"."booking_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_property_id_status_published_at_idx" ON "review" USING btree ("property_id","status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "review_property_id_status_created_at_idx" ON "review" USING btree ("property_id","status","created_at");