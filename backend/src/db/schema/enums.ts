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

export const spaceTypeEnum = pgEnum("space_type", [
  "entire_place",
  "private_room",
  "shared_room",
]);

export const listingPropertyTypeEnum = pgEnum("listing_property_type", [
  "apartment",
  "studio",
  "dormitory",
  "house",
]);

export const priceBasisEnum = pgEnum("price_basis", [
  "per_unit_month",
  "per_bed_month",
  "per_room_month",
]);

export const furnishingTypeEnum = pgEnum("furnishing_type", [
  "furnished",
  "semi",
  "unfurnished",
]);

export const smokingPolicyEnum = pgEnum("smoking_policy", [
  "inside",
  "balcony_only",
  "no",
]);

export const petsPolicyEnum = pgEnum("pets_policy", ["yes", "cats_only", "no"]);

export const guestsPolicyEnum = pgEnum("guests_policy", [
  "yes",
  "no",
  "restricted",
]);

export const leaseTermEnum = pgEnum("lease_term", [
  "semester",
  "months_6",
  "months_9",
  "year",
  "flexible",
]);

export const paymentModalityEnum = pgEnum("payment_modality", [
  "monthly",
  "semester",
  "quarterly",
]);

export const listingPosterRoleEnum = pgEnum("listing_poster_role", [
  "landlord",
  "student_sublet",
  "agent",
]);

export const targetAudienceEnum = pgEnum("target_audience", [
  "anyone",
  "students_only",
  "students_professionals",
]);

export const genderRestrictionEnum = pgEnum("gender_restriction", [
  "anyone",
  "boys_only",
  "girls_only",
]);

export const userGenderEnum = pgEnum("user_gender", ["male", "female"]);

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

export const listingReportStatusEnum = pgEnum("listing_report_status", [
  "open",
  "dismissed",
  "actioned",
]);

export const listingLifecycleEventTypeEnum = pgEnum(
  "listing_lifecycle_event_type",
  [
    "expired",
    "renew_intent",
    "improve_intent",
    "rented",
    "renewed",
    "archived",
    "admin_contacted",
  ],
);

export const listingOutcomeEnum = pgEnum("listing_outcome", [
  "rented",
  "renewed",
  "archived",
  "unknown",
]);

export const listingOutcomeSourceEnum = pgEnum("listing_outcome_source", [
  "host",
  "system",
  "admin",
]);

export const notificationKindEnum = pgEnum("notification_kind", [
  "pre_expiry",
  "expiry_prompt",
  "admin_escalation",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "push",
  "email",
  "admin_inbox",
]);

export const notificationDeliveryStatusEnum = pgEnum(
  "notification_delivery_status",
  ["pending", "sent", "skipped", "failed"],
);

export const adminActorKindEnum = pgEnum("admin_actor_kind", [
  "clerk",
  "api_key",
]);

export const degreeLevelEnum = pgEnum("degree_level", ["bachelor", "master"]);

export const billingModelEnum = pgEnum("billing_model", [
  "per_credit",
  "flat_term",
]);

export const creditSystemEnum = pgEnum("credit_system", ["us", "ects"]);

export const feePeriodEnum = pgEnum("fee_period", ["term", "year"]);

export const benefitCategoryEnum = pgEnum("benefit_category", [
  "tech",
  "food",
  "services",
  "entertainment",
  "finance",
  "telecom",
]);

export const benefitRedemptionTypeEnum = pgEnum("benefit_redemption_type", [
  "link",
  "promo_code",
  "show_id",
]);
