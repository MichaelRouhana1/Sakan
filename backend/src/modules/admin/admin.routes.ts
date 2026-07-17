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
