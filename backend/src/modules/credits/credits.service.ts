import type { creditTransactions } from "../../db/schema/index.js";
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors.js";
import {
  generateProviderExternalId,
  generateReferenceId,
} from "../../lib/reference-id.js";
import type { AdminActor } from "../../middleware/auth.js";
import { usersRepository } from "../users/users.repository.js";
import { BUNDLE_CATALOG, type CreatePurchaseInput } from "./credits.schemas.js";
import { creditsRepository } from "./credits.repository.js";
import {
  creditsReturnUrl,
  getWhishGateway,
  isWhishMockMode,
  whishCallbackUrl,
} from "./whish.service.js";
import { isWhishMockGateway } from "./whish.types.js";

type CreditTx = typeof creditTransactions.$inferSelect;

const AMOUNT_TOLERANCE_CENTS = 2;

const PROVIDER_ACTOR: AdminActor = {
  kind: "api_key",
  clerkId: null,
  userId: null,
};

function providerNote(): string {
  return isWhishMockMode() ? "Whish mock" : "Whish webhook";
}

function bundleInvoice(bundleType: CreatePurchaseInput["bundleType"]) {
  if (bundleType === "custom") return "Skoun custom credits";
  if (bundleType === "starter") return "Skoun $10 Starter";
  if (bundleType === "bundle_5") return "Skoun $15 for 5 credits";
  return "Skoun Boost Pack";
}

function amountsMatch(receivedDollars: number | undefined, expectedCents: number) {
  if (receivedDollars == null || !Number.isFinite(receivedDollars)) return false;
  const receivedCents = Math.round(receivedDollars * 100);
  return Math.abs(receivedCents - expectedCents) <= AMOUNT_TOLERANCE_CENTS;
}

function parseExternalId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isSafeInteger(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    const parsed = Number(raw);
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export class CreditsService {
  async initiatePurchase(userId: string, input: CreatePurchaseInput) {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    if (user.role !== "poster") {
      throw new ForbiddenError("Only hosts can purchase credits");
    }
    if (user.accountStatus === "restricted" || user.accountStatus === "banned") {
      throw new ForbiddenError("This account cannot purchase credits");
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

    const referenceId = generateReferenceId();
    const providerExternalId = generateProviderExternalId();
    const pending = await creditsRepository.createPending({
      userId,
      referenceId,
      bundleType: input.bundleType,
      postCreditsDelta,
      boostCreditsDelta,
      amountUsdCents,
      channel: "whish",
      providerExternalId,
    });

    if (!pending) {
      throw new AppError(500, "Could not create purchase", "TX_CREATE_FAILED");
    }

    const gateway = getWhishGateway();
    try {
      const checkout = await gateway.createCheckout({
        amountUsdCents,
        invoice: bundleInvoice(input.bundleType),
        externalId: Number(providerExternalId),
        referenceId,
        successCallbackUrl: whishCallbackUrl("success"),
        failureCallbackUrl: whishCallbackUrl("failure"),
        successRedirectUrl: creditsReturnUrl(referenceId, "success"),
        failureRedirectUrl: creditsReturnUrl(referenceId, "failure"),
      });
      const withUrl = await creditsRepository.attachCheckout(
        pending.id,
        checkout.collectUrl,
      );
      return withUrl ?? { ...pending, checkoutUrl: checkout.collectUrl };
    } catch (err) {
      await creditsRepository.rejectTransaction(pending.id, {
        ...PROVIDER_ACTOR,
        adminNote: "Whish checkout create failed",
      });
      throw err;
    }
  }

  async getByReference(referenceId: string, userId: string) {
    const tx = await creditsRepository.findByReferenceId(referenceId);
    if (!tx || tx.userId !== userId) {
      throw new NotFoundError("Transaction not found");
    }
    return tx;
  }

  async confirmByReference(referenceId: string, userId: string) {
    const tx = await this.getByReference(referenceId, userId);
    return this.settleByTransaction(tx);
  }

  async handleProviderCallback(rawExternalId: unknown, currency = "USD") {
    const externalId = parseExternalId(rawExternalId);
    if (externalId == null) {
      throw new ValidationError("Missing or invalid externalId");
    }
    const tx = await creditsRepository.findByProviderExternalId(String(externalId));
    if (!tx) {
      throw new NotFoundError("Transaction not found");
    }
    return this.settleByTransaction(tx, currency);
  }

  async completeMockCheckout(referenceId: string, outcome: "success" | "failed") {
    if (!isWhishMockMode()) {
      throw new NotFoundError();
    }
    const tx = await creditsRepository.findByReferenceId(referenceId);
    if (!tx?.providerExternalId) {
      throw new NotFoundError("Transaction not found");
    }
    const gateway = getWhishGateway();
    if (!isWhishMockGateway(gateway)) {
      throw new NotFoundError();
    }
    gateway.complete(Number(tx.providerExternalId), outcome);
    const settled = await this.settleByTransaction(tx);
    return {
      transaction: settled,
      redirectTo: creditsReturnUrl(
        tx.referenceId,
        outcome === "success" ? "success" : "failure",
      ),
    };
  }

  async getMockCheckoutPage(referenceId: string) {
    if (!isWhishMockMode()) {
      throw new NotFoundError();
    }
    const tx = await creditsRepository.findByReferenceId(referenceId);
    if (!tx) {
      throw new NotFoundError("Transaction not found");
    }
    return tx;
  }

  private async settleByTransaction(tx: CreditTx, currency = "USD") {
    if (tx.status === "approved" || tx.status === "rejected") {
      return tx;
    }
    if (tx.status !== "pending" || !tx.providerExternalId) {
      throw new AppError(409, "Transaction is not awaiting payment", "TX_NOT_PENDING");
    }

    const gateway = getWhishGateway();
    const status = await gateway.getPaymentStatus(
      currency,
      Number(tx.providerExternalId),
    );

    if (status.transactionId) {
      await creditsRepository.setProviderTransactionId(tx.id, status.transactionId);
    }

    if (status.collectStatus === "pending") {
      return (await creditsRepository.findById(tx.id)) ?? tx;
    }

    if (status.collectStatus === "success") {
      if (!amountsMatch(status.amount, tx.amountUsdCents)) {
        throw new AppError(
          409,
          "Whish amount does not match this purchase",
          "WHISH_AMOUNT_MISMATCH",
        );
      }
      const approved = await creditsRepository.approveTransaction(tx.id, {
        ...PROVIDER_ACTOR,
        adminNote: providerNote(),
      });
      if (!approved) {
        const latest = await creditsRepository.findById(tx.id);
        if (latest) return latest;
        throw new AppError(409, "Transaction not pending or not found", "TX_NOT_PENDING");
      }
      return approved;
    }

    const rejected = await creditsRepository.rejectTransaction(tx.id, {
      ...PROVIDER_ACTOR,
      adminNote: providerNote(),
    });
    return rejected ?? ((await creditsRepository.findById(tx.id)) ?? tx);
  }

  async approve(txId: string, adminNote?: string) {
    const updated = await creditsRepository.approveTransaction(txId, {
      kind: "api_key",
      clerkId: null,
      userId: null,
      adminNote,
    });
    if (!updated) {
      throw new AppError(409, "Transaction not pending or not found", "TX_NOT_PENDING");
    }
    return updated;
  }

  async reject(txId: string, adminNote?: string) {
    const updated = await creditsRepository.rejectTransaction(txId, {
      kind: "api_key",
      clerkId: null,
      userId: null,
      adminNote,
    });
    if (!updated) {
      throw new AppError(409, "Transaction not pending or not found", "TX_NOT_PENDING");
    }
    return updated;
  }

  listPending() {
    return creditsRepository.listPending();
  }
}

export const creditsService = new CreditsService();
