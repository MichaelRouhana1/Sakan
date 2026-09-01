import { Router } from "express";
import { campusController } from "./campus.controller.js";

export const campusRouter = Router();

campusRouter.get("/institutions", (req, res, next) =>
  campusController.listInstitutions(req, res, next),
);

campusRouter.get("/programs/:id/costs", (req, res, next) =>
  campusController.programCosts(req, res, next),
);

campusRouter.get("/campuses/:slug/housing-stats", (req, res, next) =>
  campusController.housingStats(req, res, next),
);
