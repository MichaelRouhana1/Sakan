import type { CreateListingDraft } from "@/features/listings/create/draft";

export type PremiumClaim = "generator_24_7" | "solar" | "hasSolar" | "elevator24_7";

/** Premium utility claims that require the legal disclaimer when newly asserted. */
export function premiumClaims(draft: CreateListingDraft): PremiumClaim[] {
  const claims: PremiumClaim[] = [];
  if (draft.electricity === "generator_24_7") claims.push("generator_24_7");
  if (draft.electricity === "solar") claims.push("solar");
  if (draft.hasSolar) claims.push("hasSolar");
  if (draft.elevator24_7) claims.push("elevator24_7");
  return claims;
}

/**
 * Gate save when a premium claim is newly turned on, or swapped for another.
 * Turning a claim off does not gate. Unchanged claims do not re-prompt.
 */
export function premiumClaimsChanged(
  before: CreateListingDraft,
  after: CreateListingDraft,
): boolean {
  const previous = new Set(premiumClaims(before));
  return premiumClaims(after).some((claim) => !previous.has(claim));
}
