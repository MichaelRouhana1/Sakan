import { api } from "@/lib/api";

/**
 * Record a WhatsApp contact tap after the platform accepts the handoff.
 * Failures stay quiet so the chat link still opens. Share is not a tap.
 */
export function recordListingContactTap(listingId: string): Promise<void> {
  if (!listingId) return Promise.resolve();
  return api
    .post(`/api/listings/${listingId}/contact-tap`, undefined, { timeout: 2500 })
    .then(() => undefined)
    .catch(() => undefined);
}
