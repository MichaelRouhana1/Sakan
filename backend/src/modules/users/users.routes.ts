import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { usersController } from "./users.controller.js";
import {
  setCampusSchema,
  setGenderSchema,
  updateRoleSchema,
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

usersRouter.patch(
  "/me/campus",
  requireAuth,
  validate(setCampusSchema),
  (req, res, next) => usersController.setCampus(req, res, next),
);
