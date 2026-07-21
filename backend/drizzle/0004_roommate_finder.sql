CREATE TYPE "public"."user_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."roommate_card_status" AS ENUM('active', 'paused', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."roommate_move_in_timing" AS ENUM('asap', 'this_month', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."roommate_invite_status" AS ENUM('pending', 'accepted', 'declined', 'withdrawn', 'expired');--> statement-breakpoint
CREATE TYPE "public"."roommate_report_target_type" AS ENUM('card', 'invite', 'match', 'user');--> statement-breakpoint
CREATE TYPE "public"."roommate_report_reason" AS ENUM('spam', 'harassment', 'fake', 'other');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" "user_gender";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "free_slot_publishes_month" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "free_slot_publishes_month_key" varchar(7);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "looking_for_roommate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE "roommate_looking_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"areas" text[] NOT NULL,
	"budget_max_usd" integer NOT NULL,
	"sleep_schedule" varchar(32) NOT NULL,
	"smoking" varchar(32) NOT NULL,
	"pets" varchar(32) NOT NULL,
	"move_in_timing" "roommate_move_in_timing" NOT NULL,
	"photo_urls" text[] DEFAULT '{}' NOT NULL,
	"contact_phone" varchar(32) NOT NULL,
	"status" "roommate_card_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "roommate_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holder_user_id" uuid NOT NULL,
	"seeker_user_id" uuid NOT NULL,
	"looking_card_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"note" varchar(500) NOT NULL,
	"status" "roommate_invite_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "roommate_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invite_id" uuid NOT NULL,
	"holder_user_id" uuid NOT NULL,
	"seeker_user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"looking_card_id" uuid NOT NULL,
	"ended_at" timestamp with time zone,
	"end_reason" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "roommate_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_user_id" uuid NOT NULL,
	"blocked_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "roommate_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"target_type" "roommate_report_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" "roommate_report_reason" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "roommate_looking_cards" ADD CONSTRAINT "roommate_looking_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_invites" ADD CONSTRAINT "roommate_invites_holder_user_id_users_id_fk" FOREIGN KEY ("holder_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_invites" ADD CONSTRAINT "roommate_invites_seeker_user_id_users_id_fk" FOREIGN KEY ("seeker_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_invites" ADD CONSTRAINT "roommate_invites_looking_card_id_roommate_looking_cards_id_fk" FOREIGN KEY ("looking_card_id") REFERENCES "public"."roommate_looking_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_invites" ADD CONSTRAINT "roommate_invites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_matches" ADD CONSTRAINT "roommate_matches_invite_id_roommate_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."roommate_invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_matches" ADD CONSTRAINT "roommate_matches_holder_user_id_users_id_fk" FOREIGN KEY ("holder_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_matches" ADD CONSTRAINT "roommate_matches_seeker_user_id_users_id_fk" FOREIGN KEY ("seeker_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_matches" ADD CONSTRAINT "roommate_matches_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_matches" ADD CONSTRAINT "roommate_matches_looking_card_id_roommate_looking_cards_id_fk" FOREIGN KEY ("looking_card_id") REFERENCES "public"."roommate_looking_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_blocks" ADD CONSTRAINT "roommate_blocks_blocker_user_id_users_id_fk" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_blocks" ADD CONSTRAINT "roommate_blocks_blocked_user_id_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roommate_reports" ADD CONSTRAINT "roommate_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "roommate_looking_cards_user_active_uidx" ON "roommate_looking_cards" USING btree ("user_id") WHERE "roommate_looking_cards"."status" <> 'withdrawn';--> statement-breakpoint
CREATE UNIQUE INDEX "roommate_invites_pending_uidx" ON "roommate_invites" USING btree ("holder_user_id","seeker_user_id","listing_id") WHERE "roommate_invites"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "roommate_blocks_pair_uidx" ON "roommate_blocks" USING btree ("blocker_user_id","blocked_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roommate_reports_pair_uidx" ON "roommate_reports" USING btree ("reporter_user_id","target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roommate_matches_invite_uidx" ON "roommate_matches" USING btree ("invite_id");
