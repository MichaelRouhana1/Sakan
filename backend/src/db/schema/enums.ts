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
