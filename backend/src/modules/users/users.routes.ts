import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { usersController } from "./users.controller.js";
import {
  completeRegistrationSchema,
  loginWithPasswordSchema,
  registerUserSchema,
  requestRegistrationCodeSchema,
  setGenderSchema,
  updateRoleSchema,
  verifyRegistrationCodeSchema,
} from "./users.schemas.js";

export const usersRouter = Router();

usersRouter.post(
  "/register",
  validate(registerUserSchema),
  (req, res, next) => usersController.register(req, res, next),
);

usersRouter.post(
  "/registration/request-code",
  validate(requestRegistrationCodeSchema),
  (req, res, next) => usersController.requestRegistrationCode(req, res, next),
);

usersRouter.post(
  "/registration/verify-code",
  validate(verifyRegistrationCodeSchema),
  (req, res, next) => usersController.verifyRegistrationCode(req, res, next),
);

usersRouter.post(
  "/registration/complete",
  validate(completeRegistrationSchema),
  (req, res, next) => usersController.completeRegistration(req, res, next),
);

usersRouter.post(
  "/login",
  validate(loginWithPasswordSchema),
  (req, res, next) => usersController.login(req, res, next),
);

usersRouter.get("/me", requireAuth, (req, res, next) =>
  usersController.me(req, res, next),
);

usersRouter.patch(
  "/me/role",
  requireAuth,
  validate(updateRoleSchema),
  (req, res, next) => usersController.updateRole(req, res, next),
);

usersRouter.post("/me/verify-phone", requireAuth, (req, res, next) =>
  usersController.verifyPhone(req, res, next),
);

usersRouter.patch(
  "/me/gender",
  requireAuth,
  validate(setGenderSchema),
  (req, res, next) => usersController.setGender(req, res, next),
);
