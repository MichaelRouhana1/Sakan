import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { listingsController } from "./listings.controller.js";
import { createListingSchema, updateListingSchema } from "./listings.schemas.js";
import { listingPhotoUpload } from "./photos.storage.js";
import { walkingRouteRateLimit } from "../../middleware/rate-limit.js";
import { walkingRoutesController } from "../walking-routes/walking-routes.controller.js";
import { copySuggestRouter } from "./copy-suggest.routes.js";
import {
  listingExpiryDecisionSchema,
  listingRenewSchema,
} from "./listing-expiry.schemas.js";

export const listingsRouter = Router();
listingsRouter.use(copySuggestRouter);

// First-time hosts still have renter role until creating their first listing.
// Authentication is required; reading guidance must not promote or charge them.
listingsRouter.get("/price-guide", requireAuth, (req, res, next) =>
  listingsController.priceGuide(req, res, next),
);

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

listingsRouter.get("/:id/expiry-decision", requireAuth, (req, res, next) =>
  listingsController.expiryDecision(req, res, next),
);

listingsRouter.post(
  "/:id/expiry-decision",
  requireAuth,
  validate(listingExpiryDecisionSchema),
  (req, res, next) => listingsController.decideExpiry(req, res, next),
);

listingsRouter.post(
  "/:id/renew",
  requireAuth,
  validate(listingRenewSchema),
  (req, res, next) => listingsController.renew(req, res, next),
);

listingsRouter.get("/:id", (req, res, next) =>
  listingsController.getById(req, res, next),
);

listingsRouter.patch(
  "/:id",
  requireAuth,
  validate(updateListingSchema),
  (req, res, next) => listingsController.update(req, res, next),
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
