import type { NextFunction, Request, Response } from "express";
import { ValidationError } from "../../lib/errors.js";
import { walkingRoutesService } from "./walking-routes.service.js";
import {
  walkingRouteParamsSchema,
  walkingRouteQuerySchema,
} from "./walking-routes.schemas.js";

function queryString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return value[0];
  }
  return undefined;
}

export class WalkingRoutesController {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const params = walkingRouteParamsSchema.safeParse(req.params);
      if (!params.success) {
        throw new ValidationError("Invalid listing id");
      }
      const query = walkingRouteQuerySchema.safeParse({
        campusSlug: queryString(req.query.campusSlug),
      });
      if (!query.success) {
        throw new ValidationError("campusSlug is required");
      }
      const data = await walkingRoutesService.getWalkingRoute(
        params.data.id,
        query.data.campusSlug,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const walkingRoutesController = new WalkingRoutesController();
