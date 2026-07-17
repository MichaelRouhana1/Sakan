import { Router } from "express";
import { universitiesController } from "./universities.controller.js";

export const universitiesRouter = Router();

universitiesRouter.get("/", (req, res, next) =>
  universitiesController.list(req, res, next),
);

universitiesRouter.get("/:slug", (req, res, next) =>
  universitiesController.getBySlug(req, res, next),
);
