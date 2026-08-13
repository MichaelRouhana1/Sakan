import type { NextFunction, Request, Response } from "express";
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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(str: string): boolean {
  return UUID_REGEX.test(str);
}

/**
 * Require authenticated user via x-user-id header.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.header("x-user-id");
  const roleHeader = req.header("x-user-role");
  const role: "renter" | "poster" = roleHeader === "poster" ? "poster" : "renter";

  if (!userId || !isValidUuid(userId)) {
    next(new ForbiddenError("Authentication required"));
    return;
  }

  req.user = { id: userId, role };
  next();
}

/** Attach user from request headers when present; never fails. */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const userId = req.header("x-user-id");
  const roleHeader = req.header("x-user-role");

  if (userId && isValidUuid(userId)) {
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
