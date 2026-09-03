import type { NextFunction, Request, Response } from "express";
import { ValidationError } from "../../lib/errors.js";
import { listBenefitsQuerySchema } from "./benefits.schemas.js";
import { benefitsService } from "./benefits.service.js";

export class BenefitsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = listBenefitsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((i) => i.message).join("; "),
        );
      }
      const data = await benefitsService.list(
        parsed.data,
        Boolean(req.user),
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await benefitsService.getById(
        req.params.id as string,
        Boolean(req.user),
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getRedemption(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await benefitsService.getRedemption(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const benefitsController = new BenefitsController();
