import "dotenv/config";
import { listingsRepository } from "../modules/listings/listings.repository.js";
import { roommateService } from "../modules/roommate/roommate.service.js";

/**
 * Cron-friendly job: archive listings past expires_at.
 * Run via: npm run job:archive-expired
 */
export async function archiveExpiredListings() {
  const archived = await listingsRepository.archiveExpired();
  for (const row of archived) {
    await roommateService.withdrawInvitesForListing(row.id);
  }
  console.log(`Archived ${archived.length} listings`);
  return archived;
}

archiveExpiredListings()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
