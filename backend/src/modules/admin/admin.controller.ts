import type { NextFunction, Request, Response } from "express";
import { creditsService } from "../credits/credits.service.js";

export class AdminController {
  async listPending(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await creditsService.listPending();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const adminNote =
        typeof req.body?.adminNote === "string" ? req.body.adminNote : undefined;
      const data = await creditsService.approve(
        req.params.txId as string,
        adminNote,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const adminNote =
        typeof req.body?.adminNote === "string" ? req.body.adminNote : undefined;
      const data = await creditsService.reject(
        req.params.txId as string,
        adminNote,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
