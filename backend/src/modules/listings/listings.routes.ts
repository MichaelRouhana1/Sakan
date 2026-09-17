import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { listingsController } from "./listings.controller.js";
import { createListingSchema } from "./listings.schemas.js";
import { listingPhotoUpload } from "./photos.storage.js";
import { walkingRouteRateLimit } from "../../middleware/rate-limit.js";
import { walkingRoutesController } from "../walking-routes/walking-routes.controller.js";

export const listingsRouter = Router();

listingsRouter.get("/", (req, res, next) =>
  listingsController.list(req, res, next),
);

listingsRouter.get("/mine", requireAuth, (req, res, next) =>
  listingsController.listMine(req, res, next),
);

listingsRouter.get("/mine/analytics", requireAuth, (req, res, next) =>
  listingsController.mineAnalytics(req, res, next),
);

listingsRouter.get("/home-popular", (req, res, next) =>
  listingsController.homePopular(req, res, next),
);

listingsRouter.post(
  "/photos",
  requireAuth,
  listingPhotoUpload.array("photos", 15),
  (req, res, next) => listingsController.uploadPhotos(req, res, next),
);

listingsRouter.post("/:id/view", optionalAuth, (req, res, next) =>
  listingsController.recordView(req, res, next),
);

listingsRouter.get("/:id/nearby", (req, res, next) =>
  listingsController.listNearby(req, res, next),
);

listingsRouter.get(
  "/:id/walking-route",
  walkingRouteRateLimit,
  (req, res, next) => walkingRoutesController.get(req, res, next),
);

listingsRouter.get("/:id/analytics", requireAuth, (req, res, next) =>
  listingsController.listingAnalytics(req, res, next),
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

listingsRouter.post("/:id/archive", requireAuth, (req, res, next) =>
  listingsController.archive(req, res, next),
);
