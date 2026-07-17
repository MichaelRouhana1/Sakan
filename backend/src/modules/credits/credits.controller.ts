import type { NextFunction, Request, Response } from "express";
import { creditsService } from "./credits.service.js";
import type { CreatePurchaseInput } from "./credits.schemas.js";

export class CreditsController {
  async createPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await creditsService.initiatePurchase(
        req.user!.id,
        req.user!.role,
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
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const creditsController = new CreditsController();
