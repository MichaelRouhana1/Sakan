import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { listingsController } from "./listings.controller.js";
import { setLookingForRoommateSchema } from "../roommate/roommate.schemas.js";
import { createListingSchema } from "./listings.schemas.js";
import { listingPhotoUpload } from "./photos.storage.js";

export const listingsRouter = Router();

listingsRouter.get("/", (req, res, next) =>
  listingsController.list(req, res, next),
);

listingsRouter.get("/mine", requireAuth, (req, res, next) =>
  listingsController.listMine(req, res, next),
);

listingsRouter.post(
  "/photos",
  requireAuth,
  listingPhotoUpload.array("photos", 8),
  (req, res, next) => listingsController.uploadPhotos(req, res, next),
);

listingsRouter.post("/:id/view", optionalAuth, (req, res, next) =>
  listingsController.recordView(req, res, next),
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

listingsRouter.patch(
  "/:id/looking-for-roommate",
  requireAuth,
  validate(setLookingForRoommateSchema),
  (req, res, next) => listingsController.setLookingForRoommate(req, res, next),
);
