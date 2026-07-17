import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { creditsController } from "./credits.controller.js";
import { createPurchaseSchema } from "./credits.schemas.js";

export const creditsRouter = Router();

creditsRouter.post(
  "/purchase",
  requireAuth,
  validate(createPurchaseSchema),
  (req, res, next) => creditsController.createPurchase(req, res, next),
);

creditsRouter.get("/:referenceId", requireAuth, (req, res, next) =>
  creditsController.getByReference(req, res, next),
);
