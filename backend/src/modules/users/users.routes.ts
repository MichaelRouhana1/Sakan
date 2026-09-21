import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { usersController } from "./users.controller.js";
import {
  setCampusSchema,
  setGenderSchema,
  updateRoleSchema,
  pushTokenSchema,
  removePushTokenSchema,
  notificationPreferencesSchema,
} from "./users.schemas.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, (req, res, next) =>
  usersController.me(req, res, next),
);

usersRouter.patch(
  "/me/role",
  requireAuth,
  validate(updateRoleSchema),
  (req, res, next) => usersController.updateRole(req, res, next),
);

usersRouter.patch(
  "/me/gender",
  requireAuth,
  validate(setGenderSchema),
  (req, res, next) => usersController.setGender(req, res, next),
);

usersRouter.patch("/me/campus", requireAuth, validate(setCampusSchema), (req, res, next) =>
  usersController.setCampus(req, res, next),
);

usersRouter.patch("/me/identity", requireAuth, (req, res, next) =>
  usersController.syncIdentity(req, res, next),
);

usersRouter.get("/me/notification-preferences", requireAuth, (req, res, next) =>
  usersController.notificationPreferences(req, res, next),
);

usersRouter.patch(
  "/me/notification-preferences",
  requireAuth,
  validate(notificationPreferencesSchema),
  (req, res, next) => usersController.updateNotificationPreferences(req, res, next),
);

usersRouter.post(
  "/me/push-tokens",
  requireAuth,
  validate(pushTokenSchema),
  (req, res, next) => usersController.registerPushToken(req, res, next),
);

usersRouter.delete(
  "/me/push-tokens",
  requireAuth,
  validate(removePushTokenSchema),
  (req, res, next) => usersController.removePushToken(req, res, next),
);
