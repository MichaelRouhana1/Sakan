import type { NextFunction, Request, Response } from "express";
import { ValidationError } from "../../lib/errors.js";
import { programCostsQuerySchema } from "./campus.schemas.js";
import { campusService } from "./campus.service.js";

export class CampusController {
  async listInstitutions(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await campusService.listInstitutions();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async programCosts(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = programCostsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((i) => i.message).join("; "),
        );
      }
      const period =
        parsed.data.period ??
        (parsed.data.terms === 2 ? "year" : "semester");
      const data = await campusService.programCosts(
        req.params.id as string,
        parsed.data.credits,
        period,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async housingStats(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      if (!slug) throw new ValidationError("Campus slug required");
      const data = await campusService.housingStats(slug);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const campusController = new CampusController();
