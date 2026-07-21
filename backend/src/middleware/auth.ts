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

/** Attach user from stub headers when present; never fails. */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const id = req.header("x-user-id");
  const role = req.header("x-user-role");
  if (id && (role === "renter" || role === "poster")) {
    req.user = { id, role };
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

/**
 * Roommate Finder gate: session user must have phoneVerifiedAt set.
 * Loads user from DB; attach phone/gender for downstream handlers.
 */
export async function requirePhoneVerified(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new ForbiddenError("Authentication required"));
      return;
    }
    const { usersRepository } = await import(
      "../modules/users/users.repository.js"
    );
    const user = await usersRepository.findById(req.user.id);
    if (!user?.phoneVerifiedAt) {
      next(
        new ForbiddenError(
          "Verified phone required for Roommate Finder",
        ),
      );
      return;
    }
    (req as Request & { dbUser?: typeof user }).dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
}
