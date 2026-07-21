import type { NextFunction, Request, Response } from "express";
import { ValidationError } from "../../lib/errors.js";
import { roommateService } from "./roommate.service.js";
import type {
  CreateInviteInput,
  UpsertLookingCardInput,
} from "./roommate.schemas.js";

export class RoommateController {
  async upsertCard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roommateService.upsertCard(
        req.user!.id,
        req.body as UpsertLookingCardInput,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getMyCard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roommateService.getMyCard(req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async patchMyCard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roommateService.patchMyCard(req.user!.id, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listSeekers(req: Request, res: Response, next: NextFunction) {
    try {
      const listingId = req.query.listingId;
      if (typeof listingId !== "string" || !listingId) {
        throw new ValidationError("listingId query is required");
      }
      const data = await roommateService.listSeekers(req.user!.id, listingId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async createInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roommateService.createInvite(
        req.user!.id,
        req.body as CreateInviteInput,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listInbox(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roommateService.listInbox(req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listSent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roommateService.listSent(req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async acceptInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roommateService.acceptInvite(
        req.user!.id,
        req.params.id as string,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async declineInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roommateService.declineInvite(
        req.user!.id,
        req.params.id as string,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roommateService.getMatch(
        req.user!.id,
        req.params.id as string,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async endMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roommateService.endMatch(
        req.user!.id,
        req.params.id as string,
        typeof req.body?.reason === "string" ? req.body.reason : undefined,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async block(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roommateService.block(
        req.user!.id,
        req.body.blockedUserId as string,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async report(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roommateService.report(req.user!.id, req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async nearby(req: Request, res: Response, next: NextFunction) {
    try {
      const area = req.query.area;
      if (typeof area !== "string" || !area) {
        throw new ValidationError("area query is required");
      }
      const data = await roommateService.nearbyCount(area);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const roommateController = new RoommateController();
