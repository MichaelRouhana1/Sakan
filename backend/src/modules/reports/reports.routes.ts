import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { reportsController } from "./reports.controller.js";
import { createReportSchema } from "./reports.schemas.js";

export const reportsRouter = Router();

reportsRouter.post(
  "/",
  requireAuth,
  validate(createReportSchema),
  (req, res, next) => reportsController.create(req, res, next),
);

reportsRouter.get("/:listingId", requireAuth, (req, res, next) =>
  reportsController.isReported(req, res, next),
);
