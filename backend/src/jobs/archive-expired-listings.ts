import "dotenv/config";
import { listingsRepository } from "../modules/listings/listings.repository.js";

/**
 * Cron-friendly job: archive listings past expires_at.
 * Run via: npm run job:archive-expired
 */
export async function archiveExpiredListings() {
  const archived = await listingsRepository.archiveExpired();
  console.log(`Archived ${archived.length} listings`);
  return archived;
}

archiveExpiredListings()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
