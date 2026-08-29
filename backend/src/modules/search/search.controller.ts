import type { NextFunction, Request, Response } from "express";
import { ValidationError } from "../../lib/errors.js";
import { searchSuggestionsQuerySchema } from "./search.schemas.js";
import { searchService } from "./search.service.js";

export class SearchController {
  async suggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const qRaw = req.query.q;
      const parsed = searchSuggestionsQuerySchema.safeParse({
        q: typeof qRaw === "string" ? qRaw : undefined,
      });
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((i) => i.message).join("; "),
        );
      }
      const data = await searchService.suggestions(parsed.data.q);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const searchController = new SearchController();
