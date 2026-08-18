import type { NextFunction, Request, Response } from "express";
import { ValidationError } from "../../lib/errors.js";
import { listingsService } from "./listings.service.js";
import {
  listListingsQuerySchema,
  type CreateListingInput,
} from "./listings.schemas.js";
import { publicUrlForUpload } from "./photos.storage.js";

function queryString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  // If somehow repeated keys arrive as string[], join so CSV parser still works.
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return value.join(",");
  }
  return undefined;
}

export class ListingsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = listListingsQuerySchema.safeParse({
        areas: queryString(req.query.areas),
        area: queryString(req.query.area),
        universitySlugs: queryString(req.query.universitySlugs),
        universitySlug: queryString(req.query.universitySlug),
        sort: queryString(req.query.sort),
        electricity: queryString(req.query.electricity),
        water: queryString(req.query.water),
        listingTypes: queryString(req.query.listingTypes),
        wifiIncluded: queryString(req.query.wifiIncluded),
        minRentUsd: queryString(req.query.minRentUsd),
        maxRentUsd: queryString(req.query.maxRentUsd),
        studentsOnly: queryString(req.query.studentsOnly),
        genderRestrictions: queryString(req.query.genderRestrictions),
      });
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((i) => i.message).join("; "),
        );
      }
      const result = await listingsService.list({
        areas: parsed.data.areas,
        universitySlugs: parsed.data.universitySlugs,
        sort: parsed.data.sort,
        electricity: parsed.data.electricity,
        water: parsed.data.water,
        listingTypes: parsed.data.listingTypes,
        wifiIncluded: parsed.data.wifiIncluded,
        minRentUsd: parsed.data.minRentUsd,
        maxRentUsd: parsed.data.maxRentUsd,
        studentsOnly: parsed.data.studentsOnly,
        genderRestrictions: parsed.data.genderRestrictions,
      });
      // Stable envelope: campuses is always an array (empty in Cities mode).
      res.json({ data: result.data, campuses: result.campuses });
    } catch (err) {
      next(err);
    }
  }

  async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await listingsService.listMine(req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await listingsService.getById(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listNearby(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await listingsService.listNearby(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async recordView(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await listingsService.recordView(
        req.params.id as string,
        req.user,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await listingsService.create(
        req.user!.id,
        req.body as CreateListingInput,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await listingsService.archive(
        req.user!.id,
        req.params.id as string,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async uploadPhotos(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        throw new ValidationError("At least one image file is required");
      }
      if (files.length > 15) {
        throw new ValidationError("Maximum 15 images per upload");
      }

      const host = req.get("host") ?? undefined;
      const urls = files.map((file) => publicUrlForUpload(file.filename, host));

      res.status(201).json({
        data: {
          urls,
          photos: urls.map((url, index) => ({
            url,
            sortOrder: index,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const listingsController = new ListingsController();
