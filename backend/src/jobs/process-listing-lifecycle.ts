import "dotenv/config";
import { expiryNotificationsRepository } from "../modules/listings/expiry-notifications.repository.js";
import { expiryNotificationsService } from "../modules/listings/expiry-notifications.service.js";
import { listingExpiryRepository } from "../modules/listings/listing-expiry.repository.js";

export async function processListingLifecycle(now = new Date()) {
  const summary = {
    archived: 0,
    nudged: 0,
    prompted: 0,
    escalated: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    receiptsChecked: 0,
  };

  for (const candidate of await expiryNotificationsRepository.preExpiryCandidates(now)) {
    const result = await expiryNotificationsService.sendHost(candidate, "pre_expiry");
    if (result.sent > 0) summary.nudged += 1;
    summary.sent += result.sent;
    summary.skipped += result.skipped;
    summary.failed += result.failed;
  }

  for (const candidate of await expiryNotificationsRepository.dueExpiryCandidates(now)) {
    if (await expiryNotificationsRepository.ensureExpired(candidate)) {
      summary.archived += 1;
    }
  }

  for (const candidate of await expiryNotificationsRepository.expiredPromptCandidates()) {
    if (
      await listingExpiryRepository.hasFinalOutcome(
        candidate.listingId,
        candidate.cycleExpiresAt,
      )
    ) continue;
    const result = await expiryNotificationsService.sendHost(candidate, "expiry_prompt");
    if (result.sent > 0) summary.prompted += 1;
    summary.sent += result.sent;
    summary.skipped += result.skipped;
    summary.failed += result.failed;
  }

  for (const candidate of await expiryNotificationsRepository.escalationCandidates(now)) {
    const result = await expiryNotificationsService.escalate(candidate);
    if (result.sent > 0) summary.escalated += 1;
    summary.sent += result.sent;
    summary.skipped += result.skipped;
    summary.failed += result.failed;
  }

  try {
    const receipts = await expiryNotificationsService.checkPushReceipts();
    summary.receiptsChecked = receipts.checked;
    summary.failed += receipts.failed;
  } catch (error) {
    summary.failed += 1;
    console.error("Could not check Expo push receipts", error);
  }

  console.log("Listing lifecycle job", summary);
  return summary;
}

if (require.main === module) {
  processListingLifecycle()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
