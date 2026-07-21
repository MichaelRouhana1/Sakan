/**
 * Smoke checks for teaser gating — run: npx tsx src/modules/roommate/roommate.serializers.test.ts
 */
import {
  assertNoGatedFields,
  toSeekerTeaser,
} from "./roommate.serializers.js";

const sample = {
  id: "00000000-0000-0000-0000-000000000001",
  userId: "00000000-0000-0000-0000-000000000002",
  areas: ["Hamra"],
  budgetMaxUsd: 500,
  sleepSchedule: "flexible",
  smoking: "no",
  pets: "no",
  moveInTiming: "flexible" as const,
  photoUrls: ["https://example.com/secret.jpg"],
  contactPhone: "96170123456",
  status: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const teaser = toSeekerTeaser(sample);
assertNoGatedFields(teaser);
console.log("roommate.serializers.test: ok");
