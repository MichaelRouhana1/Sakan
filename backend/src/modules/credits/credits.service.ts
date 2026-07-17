import { AppError, ForbiddenError, NotFoundError, ValidationError } from "../../lib/errors.js";
import { generateReferenceId } from "../../lib/reference-id.js";
import { BUNDLE_CATALOG, type CreatePurchaseInput } from "./credits.schemas.js";
import { creditsRepository } from "./credits.repository.js";

export class CreditsService {
  async initiatePurchase(
    userId: string,
    role: "renter" | "poster",
    input: CreatePurchaseInput,
  ) {
    if (role !== "poster") {
      throw new ForbiddenError("Only posters can purchase credits");
    }

    let postCreditsDelta = 0;
    let boostCreditsDelta = 0;
    let amountUsdCents = 0;

    if (input.bundleType === "custom") {
      if (
        input.postCreditsDelta == null ||
        input.boostCreditsDelta == null ||
        input.amountUsdCents == null
      ) {
        throw new ValidationError(
          "custom bundle requires postCreditsDelta, boostCreditsDelta, amountUsdCents",
        );
      }
      postCreditsDelta = input.postCreditsDelta;
      boostCreditsDelta = input.boostCreditsDelta;
      amountUsdCents = input.amountUsdCents;
    } else {
      const catalog = BUNDLE_CATALOG[input.bundleType];
      postCreditsDelta = catalog.postCreditsDelta;
      boostCreditsDelta = catalog.boostCreditsDelta;
      amountUsdCents = catalog.amountUsdCents;
    }

    return creditsRepository.createPending({
      userId,
      referenceId: generateReferenceId(),
      bundleType: input.bundleType,
      postCreditsDelta,
      boostCreditsDelta,
      amountUsdCents,
      channel: input.channel,
    });
  }

  async getByReference(referenceId: string) {
    const tx = await creditsRepository.findByReferenceId(referenceId);
    if (!tx) {
      throw new NotFoundError("Transaction not found");
    }
    return tx;
  }

  async approve(txId: string, adminNote?: string) {
    const updated = await creditsRepository.approveTransaction(txId, adminNote);
    if (!updated) {
      throw new AppError(409, "Transaction not pending or not found", "TX_NOT_PENDING");
    }
    return updated;
  }

  async reject(txId: string, adminNote?: string) {
    const updated = await creditsRepository.rejectTransaction(txId, adminNote);
    if (!updated) {
      throw new NotFoundError("Transaction not found");
    }
    return updated;
  }

  listPending() {
    return creditsRepository.listPending();
  }
}

export const creditsService = new CreditsService();
