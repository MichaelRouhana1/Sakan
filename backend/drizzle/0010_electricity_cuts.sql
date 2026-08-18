ALTER TABLE "listings" ADD COLUMN "electricity_cuts_start" varchar(5);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "electricity_cuts_end" varchar(5);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "electricity_hours_on" integer;
