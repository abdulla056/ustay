CREATE TYPE "public"."booking_message_sender" AS ENUM('guest', 'host', 'system');--> statement-breakpoint
CREATE TYPE "public"."booking_request_kind" AS ENUM('booking', 'question');--> statement-breakpoint
CREATE TYPE "public"."booking_request_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled', 'expired', 'closed');--> statement-breakpoint
CREATE TABLE "booking_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_request_id" uuid NOT NULL,
	"sender" "booking_message_sender" NOT NULL,
	"author_user_id" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_message_body_check" CHECK ("booking_message"."body" ~ '\S')
);
--> statement-breakpoint
CREATE TABLE "booking_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"kind" "booking_request_kind" NOT NULL,
	"room_id" uuid,
	"check_in" date,
	"check_out" date,
	"adults" integer,
	"children" integer,
	"guest_name" text NOT NULL,
	"guest_email" text NOT NULL,
	"guest_phone" text,
	"guest_user_id" text,
	"message" text,
	"status" "booking_request_status" DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"currency" text NOT NULL,
	"nightly_rate_minor" integer,
	"estimated_total_minor" integer,
	"guest_access_token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_request_reference_unique" UNIQUE("reference"),
	CONSTRAINT "booking_request_guest_access_token_hash_unique" UNIQUE("guest_access_token_hash"),
	CONSTRAINT "booking_request_kind_check" CHECK ((
				"booking_request"."kind" = 'booking'
				AND "booking_request"."check_in" IS NOT NULL AND "booking_request"."check_out" IS NOT NULL
				AND "booking_request"."check_out" > "booking_request"."check_in"
				AND "booking_request"."adults" IS NOT NULL AND "booking_request"."adults" >= 1
				AND "booking_request"."children" IS NOT NULL AND "booking_request"."children" >= 0
			) OR (
				"booking_request"."kind" = 'question'
				AND "booking_request"."check_in" IS NULL AND "booking_request"."check_out" IS NULL
				AND "booking_request"."room_id" IS NULL
				AND "booking_request"."adults" IS NULL AND "booking_request"."children" IS NULL
				AND "booking_request"."nightly_rate_minor" IS NULL AND "booking_request"."estimated_total_minor" IS NULL
			)),
	CONSTRAINT "booking_request_status_check" CHECK (("booking_request"."kind" = 'booking' AND "booking_request"."status" <> 'closed')
				OR ("booking_request"."kind" = 'question' AND "booking_request"."status" IN ('pending', 'closed'))),
	CONSTRAINT "booking_request_guest_name_check" CHECK ("booking_request"."guest_name" ~ '\S'),
	CONSTRAINT "booking_request_guest_email_check" CHECK ("booking_request"."guest_email" = lower("booking_request"."guest_email") AND "booking_request"."guest_email" LIKE '%@%'),
	CONSTRAINT "booking_request_message_check" CHECK ("booking_request"."message" ~ '\S'),
	CONSTRAINT "booking_request_currency_check" CHECK ("booking_request"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "booking_request_price_check" CHECK (("booking_request"."nightly_rate_minor" IS NULL) = ("booking_request"."estimated_total_minor" IS NULL)
				AND "booking_request"."nightly_rate_minor" >= 0 AND "booking_request"."estimated_total_minor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "booking_message" ADD CONSTRAINT "booking_message_booking_request_id_booking_request_id_fk" FOREIGN KEY ("booking_request_id") REFERENCES "public"."booking_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_message" ADD CONSTRAINT "booking_message_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_request" ADD CONSTRAINT "booking_request_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_request" ADD CONSTRAINT "booking_request_guest_user_id_user_id_fk" FOREIGN KEY ("guest_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_request" ADD CONSTRAINT "booking_request_room_fk" FOREIGN KEY ("property_id","room_id") REFERENCES "public"."room"("property_id","id") ON DELETE set null ("room_id") ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_message_booking_request_id_created_at_idx" ON "booking_message" USING btree ("booking_request_id","created_at");--> statement-breakpoint
CREATE INDEX "booking_request_property_id_status_created_at_idx" ON "booking_request" USING btree ("property_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "booking_request_guest_email_idx" ON "booking_request" USING btree ("guest_email");--> statement-breakpoint
CREATE INDEX "booking_request_guest_user_id_idx" ON "booking_request" USING btree ("guest_user_id");--> statement-breakpoint
CREATE INDEX "booking_request_expires_at_pending_idx" ON "booking_request" USING btree ("expires_at") WHERE "booking_request"."status" = 'pending';