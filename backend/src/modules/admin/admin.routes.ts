import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { adminController } from "./admin.controller.js";
import {
  campusCreateSchema,
  campusUpdateSchema,
  institutionCreateSchema,
  institutionUpdateSchema,
} from "./admin.schemas.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get("/overview", (req, res, next) =>
  adminController.overview(req, res, next),
);

adminRouter.get("/transactions", (req, res, next) =>
  adminController.listTransactions(req, res, next),
);

adminRouter.get("/transactions/pending", (req, res, next) =>
  adminController.listPending(req, res, next),
);

adminRouter.post("/transactions/:txId/approve", (req, res, next) =>
  adminController.approve(req, res, next),
);

adminRouter.post("/transactions/:txId/reject", (req, res, next) =>
  adminController.reject(req, res, next),
);

adminRouter.get("/reports", (req, res, next) =>
  adminController.listReports(req, res, next),
);
adminRouter.post("/reports/listings/:listingId/dismiss", (req, res, next) =>
  adminController.dismissReports(req, res, next),
);

adminRouter.get("/listings", (req, res, next) =>
  adminController.searchListings(req, res, next),
);
adminRouter.get("/listings/:id", (req, res, next) =>
  adminController.getListing(req, res, next),
);
adminRouter.post("/listings/:id/archive", (req, res, next) =>
  adminController.archiveListing(req, res, next),
);
adminRouter.post("/listings/:id/remove", (req, res, next) =>
  adminController.removeListing(req, res, next),
);
adminRouter.post("/listings/:id/restore", (req, res, next) =>
  adminController.restoreListing(req, res, next),
);

adminRouter.get("/users", (req, res, next) =>
  adminController.searchUsers(req, res, next),
);
adminRouter.patch("/users/:id/status", (req, res, next) =>
  adminController.setUserStatus(req, res, next),
);

adminRouter.get("/audit", (req, res, next) =>
  adminController.listAudit(req, res, next),
);

adminRouter.get("/catalog", (req, res, next) =>
  adminController.listCatalog(req, res, next),
);

adminRouter.get("/institutions", (req, res, next) =>
  adminController.listInstitutions(req, res, next),
);
adminRouter.post(
  "/institutions",
  validate(institutionCreateSchema),
  (req, res, next) => adminController.createInstitution(req, res, next),
);
adminRouter.patch(
  "/institutions/:id",
  validate(institutionUpdateSchema),
  (req, res, next) => adminController.updateInstitution(req, res, next),
);
adminRouter.post("/campuses", validate(campusCreateSchema), (req, res, next) =>
  adminController.createCampus(req, res, next),
);
adminRouter.patch(
  "/campuses/:id",
  validate(campusUpdateSchema),
  (req, res, next) => adminController.updateCampus(req, res, next),
);
