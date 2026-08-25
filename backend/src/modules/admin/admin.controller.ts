import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError, ValidationError } from "../../lib/errors.js";
import { adminService } from "./admin.service.js";
import { adminUniversitiesService } from "./admin-universities.service.js";
import {
  adminNoteBodySchema,
  auditQuerySchema,
  listTransactionsQuerySchema,
  listingStatusQuerySchema,
  reportStatusQuerySchema,
  reviewTransactionBodySchema,
  userStatusBodySchema,
} from "./admin.schemas.js";
import type {
  CampusCreateInput,
  CampusUpdateInput,
  InstitutionCreateInput,
  InstitutionUpdateInput,
} from "./admin.schemas.js";

function requireActor(req: Request) {
  if (!req.admin) {
    throw new UnauthorizedError("Admin access required");
  }
  return req.admin;
}

function parseListQuery(req: Request) {
  const parsed = listTransactionsQuerySchema.safeParse({
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    referenceId:
      typeof req.query.referenceId === "string"
        ? req.query.referenceId
        : undefined,
    history:
      typeof req.query.history === "string" ? req.query.history : undefined,
  });
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ValidationError(message);
  }
  return {
    status: parsed.data.status,
    referenceId: parsed.data.referenceId,
    history:
      parsed.data.history === "true" || parsed.data.history === "1",
  };
}

export class AdminController {
  async listTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.listTransactions(parseListQuery(req));
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listPending(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.listTransactions({ status: "pending" });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async overview(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.overview();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const body = reviewTransactionBodySchema.safeParse(req.body ?? {});
      if (!body.success) {
        throw new ValidationError(
          body.error.issues.map((i) => i.message).join("; "),
        );
      }
      const data = await adminService.approve(
        req.params.txId as string,
        actor,
        body.data.adminNote,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const body = reviewTransactionBodySchema.safeParse(req.body ?? {});
      if (!body.success) {
        throw new ValidationError(
          body.error.issues.map((i) => i.message).join("; "),
        );
      }
      const data = await adminService.reject(
        req.params.txId as string,
        actor,
        body.data.adminNote,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listReports(req: Request, res: Response, next: NextFunction) {
    try {
      const raw =
        typeof req.query.status === "string" ? req.query.status : "open";
      const parsed = reportStatusQuerySchema.safeParse(raw);
      if (!parsed.success) {
        throw new ValidationError("status must be open, dismissed, or actioned");
      }
      const data = await adminService.listReportGroups(parsed.data);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async dismissReports(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const body = adminNoteBodySchema.safeParse(req.body ?? {});
      if (!body.success) throw new ValidationError("Invalid body");
      const data = await adminService.dismissListingReports(
        req.params.listingId as string,
        actor,
        body.data.adminNote,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async searchListings(req: Request, res: Response, next: NextFunction) {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const statusRaw =
        typeof req.query.status === "string" ? req.query.status : undefined;
      let status: "draft" | "active" | "archived" | "removed" | undefined;
      if (statusRaw) {
        const parsed = listingStatusQuerySchema.safeParse(statusRaw);
        if (!parsed.success) {
          throw new ValidationError(
            "status must be draft, active, archived, or removed",
          );
        }
        status = parsed.data;
      }
      const data = await adminService.searchListings({ q, status });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getListing(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getListing(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async archiveListing(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const body = adminNoteBodySchema.safeParse(req.body ?? {});
      if (!body.success) throw new ValidationError("Invalid body");
      const data = await adminService.archiveListing(
        req.params.id as string,
        actor,
        body.data.adminNote,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async removeListing(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const body = adminNoteBodySchema.safeParse(req.body ?? {});
      if (!body.success) throw new ValidationError("Invalid body");
      const data = await adminService.removeListing(
        req.params.id as string,
        actor,
        body.data.adminNote,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async restoreListing(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const body = adminNoteBodySchema.safeParse(req.body ?? {});
      if (!body.success) throw new ValidationError("Invalid body");
      const data = await adminService.restoreListing(
        req.params.id as string,
        actor,
        body.data.adminNote,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const data = await adminService.searchUsers(q);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async setUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const body = userStatusBodySchema.safeParse(req.body ?? {});
      if (!body.success) {
        throw new ValidationError("status must be active, restricted, or banned");
      }
      const data = await adminService.setUserStatus(
        req.params.id as string,
        body.data.status,
        actor,
        body.data.adminNote,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listAudit(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = auditQuerySchema.safeParse({
        action:
          typeof req.query.action === "string" ? req.query.action : undefined,
        entityType:
          typeof req.query.entityType === "string"
            ? req.query.entityType
            : undefined,
        entityId:
          typeof req.query.entityId === "string"
            ? req.query.entityId
            : undefined,
        limit: typeof req.query.limit === "string" ? req.query.limit : undefined,
      });
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        );
      }
      const data = await adminService.listAuditEvents(parsed.data);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listInstitutions(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminUniversitiesService.listInstitutions();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listCatalog(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminUniversitiesService.listCatalog();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async createInstitution(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const data = await adminUniversitiesService.createInstitution(
        req.body as InstitutionCreateInput,
        actor,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async updateInstitution(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const data = await adminUniversitiesService.updateInstitution(
        req.params.id as string,
        req.body as InstitutionUpdateInput,
        actor,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async createCampus(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const data = await adminUniversitiesService.createCampus(
        req.body as CampusCreateInput,
        actor,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async updateCampus(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const data = await adminUniversitiesService.updateCampus(
        req.params.id as string,
        req.body as CampusUpdateInput,
        actor,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
