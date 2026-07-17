import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { usersController } from "./users.controller.js";
import { registerUserSchema } from "./users.schemas.js";

export const usersRouter = Router();

usersRouter.post(
  "/register",
  validate(registerUserSchema),
  (req, res, next) => usersController.register(req, res, next),
);

usersRouter.get("/me", requireAuth, (req, res, next) =>
  usersController.me(req, res, next),
);
