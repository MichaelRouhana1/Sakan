import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["renter", "poster"]);

export const userAccountStatusEnum = pgEnum("user_account_status", [
  "active",
  "restricted",
  "banned",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "active",
  "archived",
  "removed",
]);

export const listingTypeEnum = pgEnum("listing_type", [
  "entire_apartment",
  "studio",
  "private_room",
  "shared_dorm_bed",
]);

export const targetAudienceEnum = pgEnum("target_audience", [
  "anyone",
  "students_only",
]);

export const genderRestrictionEnum = pgEnum("gender_restriction", [
  "anyone",
  "boys_only",
  "girls_only",
]);

export const userGenderEnum = pgEnum("user_gender", ["male", "female"]);

export const roommateCardStatusEnum = pgEnum("roommate_card_status", [
  "active",
  "paused",
  "withdrawn",
]);

export const roommateMoveInTimingEnum = pgEnum("roommate_move_in_timing", [
  "asap",
  "this_month",
  "flexible",
]);

export const roommateInviteStatusEnum = pgEnum("roommate_invite_status", [
  "pending",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
]);

export const roommateReportTargetTypeEnum = pgEnum(
  "roommate_report_target_type",
  ["card", "invite", "match", "user"],
);

export const roommateReportReasonEnum = pgEnum("roommate_report_reason", [
  "spam",
  "harassment",
  "fake",
  "other",
]);

export const electricityStatusEnum = pgEnum("electricity_status", [
  "solar",
  "generator_24_7",
  "scheduled_cuts",
]);

export const waterStatusEnum = pgEnum("water_status", [
  "state_well_24_7",
  "tank_delivery",
]);

export const creditTxStatusEnum = pgEnum("credit_tx_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export const creditBundleTypeEnum = pgEnum("credit_bundle_type", [
  "starter",
  "bundle_5",
  "boost_pack",
  "custom",
]);

export const paymentChannelEnum = pgEnum("payment_channel", ["whish", "omt"]);

export const listingReportReasonEnum = pgEnum("listing_report_reason", [
  "fake",
  "inaccurate_utilities",
  "already_rented",
]);
