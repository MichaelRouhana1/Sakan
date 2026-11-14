export const UNIVERSITIES = [
  "AUB",
  "LAU",
  "USJ",
  "NDU",
  "USEK",
  "LU",
  "BAU",
  "UOB",
  "Other",
] as const;

export type University = (typeof UNIVERSITIES)[number];

export const HOUSING_TIMINGS = [
  "This semester",
  "Next semester",
  "Just looking",
] as const;

export type HousingTiming = (typeof HOUSING_TIMINGS)[number];

export const UNIT_COUNTS = ["1", "2–5", "6–20", "20+"] as const;

export type UnitCount = (typeof UNIT_COUNTS)[number];

export type WaitlistRole = "student" | "landlord";

export const BRAND = {
  name: "Studently",
  primary: "#EA3F4A",
  contactEmail: process.env.CONTACT_EMAIL ?? "hello@studently.app",
  instagramUrl:
    process.env.INSTAGRAM_URL ?? "https://instagram.com/studently.app",
} as const;
