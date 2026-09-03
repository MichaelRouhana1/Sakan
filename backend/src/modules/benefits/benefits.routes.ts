import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { benefitsController } from "./benefits.controller.js";

export const benefitsRouter = Router();

// Browsable without an account; `redemptionData` is nulled out for anonymous callers.
benefitsRouter.get("/", optionalAuth, (req, res, next) =>
  benefitsController.list(req, res, next),
);

benefitsRouter.get("/:id/redemption", requireAuth, (req, res, next) =>
  benefitsController.getRedemption(req, res, next),
);

benefitsRouter.get("/:id", optionalAuth, (req, res, next) =>
  benefitsController.getById(req, res, next),
);
