import { roommateLookingCards } from "../../db/schema/roommate.js";

type LookingCard = typeof roommateLookingCards.$inferSelect;

/** Allowlist teaser — never includes gender, phone, or photos. */
export function toSeekerTeaser(card: LookingCard) {
  return {
    id: card.id,
    areas: card.areas,
    budgetMaxUsd: card.budgetMaxUsd,
    sleepSchedule: card.sleepSchedule,
    smoking: card.smoking,
    pets: card.pets,
    moveInTiming: card.moveInTiming,
    status: card.status,
    updatedAt: card.updatedAt,
  };
}

/** Owner view — includes own photos + contact. */
export function toOwnerCard(card: LookingCard) {
  return {
    id: card.id,
    areas: card.areas,
    budgetMaxUsd: card.budgetMaxUsd,
    sleepSchedule: card.sleepSchedule,
    smoking: card.smoking,
    pets: card.pets,
    moveInTiming: card.moveInTiming,
    contactPhone: card.contactPhone,
    photoUrls: card.photoUrls,
    status: card.status,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

/** Unlocked after mutual accept. */
export function toUnlockedSeekerCard(card: LookingCard) {
  return {
    id: card.id,
    areas: card.areas,
    budgetMaxUsd: card.budgetMaxUsd,
    sleepSchedule: card.sleepSchedule,
    smoking: card.smoking,
    pets: card.pets,
    moveInTiming: card.moveInTiming,
    photoUrls: card.photoUrls,
    whatsappPhone: card.contactPhone,
  };
}

export const END_MATCH_COPY =
  "Contact is hidden in Skoun. If you already saved the number in WhatsApp, that chat is unchanged.";

/** Unit-test helper: assert teaser/pending payloads omit gated keys. */
export function assertNoGatedFields(payload: unknown): void {
  const forbidden = [
    "gender",
    "phone",
    "photoUrls",
    "contactPhone",
    "photo",
    "whatsappPhone",
  ];
  const json = JSON.stringify(payload);
  for (const key of forbidden) {
    if (json.includes(`"${key}"`)) {
      throw new Error(`Gated field leaked in payload: ${key}`);
    }
  }
}
