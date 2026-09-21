import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { loadEnv } from "../../config/env.js";
import { universitiesRepository } from "../universities/universities.repository.js";
import { copySuggestSchema } from "./copy-suggest.schemas.js";
import { suggestListingCopy } from "./copy-suggest.service.js";
import type { CopyFacts, CopyMode } from "./listingCopyTemplates.js";

export function createCopySuggestLimiter() {
  return rateLimit({
    windowMs: 60 * 60 * 1000, limit: 10,
    keyGenerator: (req) => req.user!.id,
    skip: () => !loadEnv().GEMINI_API_KEY,
    standardHeaders: true, legacyHeaders: false,
    handler: (_req, res, next) => { res.locals.copyTemplateOnly = true; next(); },
  });
}

export const copySuggestRouter = Router();
copySuggestRouter.post("/copy-suggest", requireAuth, validate(copySuggestSchema), createCopySuggestLimiter(), async (req, res) => {
  const { mode, facts } = req.body as { mode: CopyMode; facts: CopyFacts };
  let campusLookupFailed = false;
  if (facts.primaryCampusId) {
    try {
      const campus = await universitiesRepository.findById(facts.primaryCampusId);
      facts.campusName = campus?.name ?? null;
    } catch {
      facts.campusName = null;
      campusLookupFailed = true;
    }
  }
  const data = await suggestListingCopy(facts, mode, {
    apiKey: loadEnv().GEMINI_API_KEY,
    templateOnly: Boolean(res.locals.copyTemplateOnly) || campusLookupFailed,
  });
  res.json({ data });
});
