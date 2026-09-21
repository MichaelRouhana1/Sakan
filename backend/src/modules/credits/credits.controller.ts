import type { NextFunction, Request, Response } from "express";
import { creditsService } from "./credits.service.js";
import type { CreatePurchaseInput, MockCompleteInput } from "./credits.schemas.js";
import { renderMockCheckoutPage } from "./whish.mock.js";

function formatUsdFromCents(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function queryValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

function callbackExternalId(req: Request): string | undefined {
  return (
    queryValue(req.query.externalId) ??
    queryValue(req.body?.externalId) ??
    queryValue(req.query.external_id)
  );
}

function callbackCurrency(req: Request): string {
  return queryValue(req.query.currency) ?? queryValue(req.body?.currency) ?? "USD";
}

export class CreditsController {
  async createPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await creditsService.initiatePurchase(
        req.user!.id,
        req.body as CreatePurchaseInput,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getByReference(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await creditsService.getByReference(
        req.params.referenceId as string,
        req.user!.id,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async confirmByReference(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await creditsService.confirmByReference(
        req.params.referenceId as string,
        req.user!.id,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async providerCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await creditsService.handleProviderCallback(
        callbackExternalId(req),
        callbackCurrency(req),
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async mockCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const referenceId = queryValue(req.query.referenceId);
      if (!referenceId) {
        res.status(400).type("html").send("Missing referenceId");
        return;
      }
      const tx = await creditsService.getMockCheckoutPage(referenceId);
      res
        .status(200)
        .type("html")
        .send(
          renderMockCheckoutPage({
            referenceId: tx.referenceId,
            amountLabel: formatUsdFromCents(tx.amountUsdCents),
            completePath: "/api/credits/whish/mock/complete",
            returnTo: queryValue(req.query.returnTo),
          }),
        );
    } catch (err) {
      next(err);
    }
  }

  async mockComplete(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as MockCompleteInput;
      const { redirectTo } = await creditsService.completeMockCheckout(
        body.referenceId,
        body.outcome,
        body.returnTo,
      );
      res.redirect(302, redirectTo);
    } catch (err) {
      next(err);
    }
  }
}

export const creditsController = new CreditsController();
