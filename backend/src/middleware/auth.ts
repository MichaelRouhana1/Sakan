import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../lib/errors.js";

/** Placeholder auth context until OTP/JWT is wired. */
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
 * Stub middleware — attach a user from `x-user-id` / `x-user-role` headers in development.
 * Replace with WhatsApp OTP + JWT verification.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const id = req.header("x-user-id");
  const role = req.header("x-user-role");

  if (!id || (role !== "renter" && role !== "poster")) {
    next(new ForbiddenError("Authentication required"));
    return;
  }

  req.user = { id, role };
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
