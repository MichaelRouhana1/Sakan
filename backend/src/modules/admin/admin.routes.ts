import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.js";
import { adminController } from "./admin.controller.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get("/transactions/pending", (req, res, next) =>
  adminController.listPending(req, res, next),
);

adminRouter.post("/transactions/:txId/approve", (req, res, next) =>
  adminController.approve(req, res, next),
);

adminRouter.post("/transactions/:txId/reject", (req, res, next) =>
  adminController.reject(req, res, next),
);

adminRouter.get("/institutions", (req, res, next) =>
  adminController.listInstitutions(req, res, next),
);
adminRouter.post("/institutions", (req, res, next) =>
  adminController.createInstitution(req, res, next),
);
adminRouter.patch("/institutions/:id", (req, res, next) =>
  adminController.updateInstitution(req, res, next),
);
adminRouter.post("/campuses", (req, res, next) =>
  adminController.createCampus(req, res, next),
);
adminRouter.patch("/campuses/:id", (req, res, next) =>
  adminController.updateCampus(req, res, next),
);
