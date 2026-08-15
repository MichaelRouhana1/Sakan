import { Router } from "express";
import { universitiesController } from "./universities.controller.js";

export const institutionsRouter = Router();

institutionsRouter.get("/", (req, res, next) =>
  universitiesController.listInstitutions(req, res, next),
);
