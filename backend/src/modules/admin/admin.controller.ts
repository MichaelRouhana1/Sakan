import type { NextFunction, Request, Response } from "express";
import { creditsService } from "../credits/credits.service.js";
import { adminUniversitiesService } from "./admin-universities.service.js";

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

  async listInstitutions(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminUniversitiesService.listInstitutions();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async createInstitution(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminUniversitiesService.createInstitution(req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async updateInstitution(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminUniversitiesService.updateInstitution(
        req.params.id as string,
        req.body,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async createCampus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminUniversitiesService.createCampus(req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async updateCampus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminUniversitiesService.updateCampus(
        req.params.id as string,
        req.body,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
