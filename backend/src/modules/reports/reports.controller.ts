import type { NextFunction, Request, Response } from "express";
import type { CreateReportInput } from "./reports.schemas.js";
import { reportsService } from "./reports.service.js";

export class ReportsController {
  async isReported(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportsService.isReported(
        req.user!.id,
        req.user!.role,
        req.params.listingId as string,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportsService.create(
        req.user!.id,
        req.user!.role,
        req.body as CreateReportInput,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const reportsController = new ReportsController();
