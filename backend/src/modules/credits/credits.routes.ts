import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { creditsController } from "./credits.controller.js";
import { createPurchaseSchema, mockCompleteSchema } from "./credits.schemas.js";
import { isWhishMockMode } from "./whish.service.js";

export const creditsRouter = Router();

creditsRouter.post(
  "/purchase",
  requireAuth,
  validate(createPurchaseSchema),
  (req, res, next) => creditsController.createPurchase(req, res, next),
);

creditsRouter.get("/whish/callback/success", (req, res, next) =>
  creditsController.providerCallback(req, res, next),
);
creditsRouter.post("/whish/callback/success", (req, res, next) =>
  creditsController.providerCallback(req, res, next),
);
creditsRouter.get("/whish/callback/failure", (req, res, next) =>
  creditsController.providerCallback(req, res, next),
);
creditsRouter.post("/whish/callback/failure", (req, res, next) =>
  creditsController.providerCallback(req, res, next),
);

if (isWhishMockMode()) {
  creditsRouter.get("/whish/mock/checkout", (req, res, next) =>
    creditsController.mockCheckout(req, res, next),
  );
  creditsRouter.post(
    "/whish/mock/complete",
    validate(mockCompleteSchema),
    (req, res, next) => creditsController.mockComplete(req, res, next),
  );
}

creditsRouter.post("/:referenceId/confirm", requireAuth, (req, res, next) =>
  creditsController.confirmByReference(req, res, next),
);

creditsRouter.get("/:referenceId", requireAuth, (req, res, next) =>
  creditsController.getByReference(req, res, next),
);
