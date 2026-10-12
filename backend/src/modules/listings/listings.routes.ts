import { editPlace, editPlaceSchema } from './place-edit.service.js';
import { listingsRepository } from './listings.repository.js';
import { db } from '../../db/index.js';
import { sql } from 'drizzle-orm';
import { NotFoundError } from '../../lib/errors.js';
import { sharedFields } from './place-fields.js';
import { ownerPlace, publishedBatch, publishQuote, publishUnits, publishUnitsSchema } from './unit-publish.service.js';
import { z } from 'zod';
import { inventorySchema, updateUnitInventory, setPlaceHidden, getOwnerInventory } from './inventory.service.js';
import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { listingsController } from "./listings.controller.js";
import {
  createListingSchema,
  setListingAvailabilitySchema,
  updateListingSchema,
} from "./listings.schemas.js";
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
listingsRouter.patch('/places/:placeId',requireAuth,validate(editPlaceSchema),async(req,res,next)=>{
 try{res.json({data:await editPlace(req.user!.id,z.uuid().parse(req.params.placeId),req.body)})}catch(e){next(e)}
});
listingsRouter.get('/:id/owner-edit',requireAuth,async(req,res,next)=>{
 try{
  const id=z.uuid().parse(req.params.id);
  const [row]=await db.execute(sql`SELECT place_id,place_overrides,unit_amenities,amenity_overrides FROM listings WHERE id=${id}::uuid AND poster_id=${req.user!.id}::uuid`);
  if(!row)throw new NotFoundError('Unit not found');
  const differentFields=Object.entries(sharedFields).filter(([,col])=>Object.hasOwn(row.place_overrides as object,col)).map(([key])=>key);
  if((row.unit_amenities as unknown[]).length || Object.keys(row.amenity_overrides as object).length)differentFields.push('amenities');
  res.json({data:await listingsRepository.findById(id),place:await ownerPlace(req.user!.id,String(row.place_id)),differentFields});
 }catch(e){next(e)}
});
listingsRouter.get('/places/:placeId',requireAuth,async(req,res,next)=>{
 try{res.json({data:await ownerPlace(req.user!.id,z.uuid().parse(req.params.placeId))})}catch(e){next(e)}
});
listingsRouter.get('/publish-quote',requireAuth,async(req,res,next)=>{
 try{res.json({data:await publishQuote(req.user!.id,z.coerce.number().int().min(1).max(20).parse(req.query.count))})}catch(e){next(e)}
});
listingsRouter.post('/publish-units',requireAuth,validate(publishUnitsSchema),async(req,res,next)=>{
 try{res.status(201).json({data:await publishUnits(req.user!.id,req.body)})}catch(e){next(e)}
});
listingsRouter.get('/publish-units/:requestId',requireAuth,async(req,res,next)=>{
 try{res.json({data:await publishedBatch(req.user!.id,z.uuid().parse(req.params.requestId))})}catch(e){next(e)}
});
listingsRouter.get('/:id/inventory',requireAuth,async(req,res,next)=>{
 try {res.json({data:await getOwnerInventory(z.uuid().parse(req.params.id),req.user!.id)})} catch(e){next(e)}
});
listingsRouter.patch('/places/:placeId/visibility',requireAuth,validate(z.object({hidden:z.boolean()}).strict()),async(req,res,next)=>{
 try {res.json({data:await setPlaceHidden(z.uuid().parse(req.params.placeId),req.body.hidden,req.user!.id)})} catch(e){next(e)}
});
listingsRouter.patch('/:id/inventory',requireAuth,validate(inventorySchema),async(req,res,next)=>{
 try {res.json({data:await updateUnitInventory(z.uuid().parse(req.params.id),req.body,req.user!.id)})} catch(e){next(e)}
});

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

listingsRouter.get("/drafts", requireAuth, (req, res, next) =>
  listingsController.listDrafts(req, res, next),
);

listingsRouter.put("/drafts/:slot", requireAuth, (req, res, next) =>
  listingsController.saveDraft(req, res, next),
);

listingsRouter.delete("/drafts/:slot", requireAuth, (req, res, next) =>
  listingsController.deleteDraft(req, res, next),
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

listingsRouter.post("/:id/contact-tap", optionalAuth, (req, res, next) =>
  listingsController.recordContactTap(req, res, next),
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
  "/:id/availability",
  requireAuth,
  validate(setListingAvailabilitySchema),
  (req, res, next) => listingsController.setAvailability(req, res, next),
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

listingsRouter.delete("/:id", requireAuth, (req, res, next) =>
  listingsController.remove(req, res, next),
);
