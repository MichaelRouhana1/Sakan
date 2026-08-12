import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { ForbiddenError } from "../lib/errors.js";

/** Auth context for authenticated users. */
export type AuthUser = {
  id: string;
  role: "renter" | "poster";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Require authenticated user via Clerk session JWT or x-user-id header fallback.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const clerkUserId = auth.userId;
  const headerUserId = req.header("x-user-id");
  const roleHeader = req.header("x-user-role");

  const userId = clerkUserId || headerUserId;
  const role: "renter" | "poster" = roleHeader === "poster" ? "poster" : "renter";

  if (!userId) {
    next(new ForbiddenError("Authentication required"));
    return;
  }

  req.user = { id: userId, role };
  next();
}

/** Attach user from Clerk session or headers when present; never fails. */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const auth = getAuth(req);
  const clerkUserId = auth.userId;
  const headerUserId = req.header("x-user-id");
  const roleHeader = req.header("x-user-role");

  const userId = clerkUserId || headerUserId;
  if (userId) {
    const role: "renter" | "poster" = roleHeader === "poster" ? "poster" : "renter";
    req.user = { id: userId, role };
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const key = req.header("x-admin-key");
  const expected = process.env.ADMIN_API_KEY;

  if (!expected || key !== expected) {
    next(new ForbiddenError("Admin access required"));
    return;
  }

  next();
}
