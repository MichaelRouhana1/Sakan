import type { NextFunction, Request, Response } from "express";
import type { ImportSavedInput } from "./saved.schemas.js";
import { savedService } from "./saved.service.js";

export class SavedController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await savedService.list(req.user!.id, req.user!.role);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async isSaved(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await savedService.isSaved(
        req.user!.id,
        req.user!.role,
        req.params.listingId as string,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async save(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await savedService.save(
        req.user!.id,
        req.user!.role,
        req.params.listingId as string,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async unsave(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await savedService.unsave(
        req.user!.id,
        req.user!.role,
        req.params.listingId as string,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async importLocal(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await savedService.importLocal(
        req.user!.id,
        req.user!.role,
        req.body as ImportSavedInput,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const savedController = new SavedController();
