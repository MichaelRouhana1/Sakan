import "dotenv/config";
import { processListingLifecycle } from "./process-listing-lifecycle.js";

/** Compatibility alias for the hourly listing lifecycle processor. */
export async function archiveExpiredListings() {
  return processListingLifecycle();
}

archiveExpiredListings()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
