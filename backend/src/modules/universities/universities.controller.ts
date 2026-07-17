import type { NextFunction, Request, Response } from "express";
import { universitiesService } from "./universities.service.js";

export class UniversitiesController {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await universitiesService.list();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await universitiesService.getBySlug(
        req.params.slug as string,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const universitiesController = new UniversitiesController();
