import { Router } from "express";
import { requireAuth, requirePhoneVerified } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { roommateController } from "./roommate.controller.js";
import {
  blockSchema,
  createInviteSchema,
  endMatchSchema,
  reportSchema,
  upsertLookingCardSchema,
} from "./roommate.schemas.js";

export const roommateRouter = Router();

roommateRouter.use(requireAuth, requirePhoneVerified);

roommateRouter.post(
  "/cards",
  validate(upsertLookingCardSchema),
  (req, res, next) => roommateController.upsertCard(req, res, next),
);

roommateRouter.get("/cards/me", (req, res, next) =>
  roommateController.getMyCard(req, res, next),
);

roommateRouter.patch("/cards/me", (req, res, next) =>
  roommateController.patchMyCard(req, res, next),
);

roommateRouter.get("/seekers", (req, res, next) =>
  roommateController.listSeekers(req, res, next),
);

roommateRouter.post(
  "/invites",
  validate(createInviteSchema),
  (req, res, next) => roommateController.createInvite(req, res, next),
);

roommateRouter.get("/invites", (req, res, next) =>
  roommateController.listInbox(req, res, next),
);

roommateRouter.get("/invites/sent", (req, res, next) =>
  roommateController.listSent(req, res, next),
);

roommateRouter.post("/invites/:id/accept", (req, res, next) =>
  roommateController.acceptInvite(req, res, next),
);

roommateRouter.post("/invites/:id/decline", (req, res, next) =>
  roommateController.declineInvite(req, res, next),
);

roommateRouter.get("/matches/:id", (req, res, next) =>
  roommateController.getMatch(req, res, next),
);

roommateRouter.post(
  "/matches/:id/end",
  validate(endMatchSchema),
  (req, res, next) => roommateController.endMatch(req, res, next),
);

roommateRouter.post("/blocks", validate(blockSchema), (req, res, next) =>
  roommateController.block(req, res, next),
);

roommateRouter.post("/reports", validate(reportSchema), (req, res, next) =>
  roommateController.report(req, res, next),
);

roommateRouter.get("/stats/nearby", (req, res, next) =>
  roommateController.nearby(req, res, next),
);
