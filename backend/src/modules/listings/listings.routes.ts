import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { listingsController } from "./listings.controller.js";
import { createListingSchema } from "./listings.schemas.js";

export const listingsRouter = Router();

listingsRouter.get("/", (req, res, next) =>
  listingsController.list(req, res, next),
);

listingsRouter.get("/:id", (req, res, next) =>
  listingsController.getById(req, res, next),
);

listingsRouter.post(
  "/",
  requireAuth,
  validate(createListingSchema),
  (req, res, next) => listingsController.create(req, res, next),
);
