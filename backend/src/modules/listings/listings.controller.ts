import type { NextFunction, Request, Response } from "express";
import { listingsService } from "./listings.service.js";
import type { CreateListingInput } from "./listings.schemas.js";

export class ListingsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const area = typeof req.query.area === "string" ? req.query.area : undefined;
      const universitySlug =
        typeof req.query.universitySlug === "string"
          ? req.query.universitySlug
          : undefined;
      const data = await listingsService.list({ area, universitySlug });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await listingsService.getById(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await listingsService.createDraft(
        req.user!.id,
        req.user!.role,
        req.body as CreateListingInput,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const listingsController = new ListingsController();
