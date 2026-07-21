import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { savedController } from "./saved.controller.js";
import { importSavedSchema } from "./saved.schemas.js";

export const savedRouter = Router();

savedRouter.get("/", requireAuth, (req, res, next) =>
  savedController.list(req, res, next),
);

savedRouter.post(
  "/import",
  requireAuth,
  validate(importSavedSchema),
  (req, res, next) => savedController.importLocal(req, res, next),
);

savedRouter.get("/:listingId", requireAuth, (req, res, next) =>
  savedController.isSaved(req, res, next),
);

savedRouter.post("/:listingId", requireAuth, (req, res, next) =>
  savedController.save(req, res, next),
);

savedRouter.delete("/:listingId", requireAuth, (req, res, next) =>
  savedController.unsave(req, res, next),
);
