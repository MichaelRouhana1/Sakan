import { verifyToken } from "@clerk/backend";
import type { NextFunction, Request, Response } from "express";
import { isUsableClerkSecret, loadEnv } from "../config/env.js";
import { AppError, UnauthorizedError } from "../lib/errors.js";
import { getClerkClient, getClerkSecretKey } from "../lib/clerk.js";
import { usersRepository } from "../modules/users/users.repository.js";

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

function bearerToken(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

type ClerkVerifyResult = {
  sub?: string;
  data?: { sub?: string } | null;
  errors?: unknown[];
};

function clerkUserIdFromVerifyResult(result: unknown): string | null {
  const verified = result as ClerkVerifyResult;
  if (verified.errors && verified.errors.length > 0) return null;
  return verified.data?.sub ?? verified.sub ?? null;
}

async function resolveAuthUser(req: Request): Promise<AuthUser | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const env = loadEnv();
  if (!isUsableClerkSecret(env.CLERK_SECRET_KEY)) {
    throw new AppError(
      500,
      "CLERK_SECRET_KEY is not configured. Paste the real sk_test_ key from the Clerk Dashboard into backend/.env",
      "AUTH_MISCONFIGURED",
    );
  }

  let clerkUserId: string;
  try {
    const verified = await verifyToken(token, {
      secretKey: getClerkSecretKey(),
    });
    const sub = clerkUserIdFromVerifyResult(verified);
    if (!sub) return null;
    clerkUserId = sub;
  } catch {
    return null;
  }

  let user = await usersRepository.findByClerkId(clerkUserId);
  if (!user) {
    const clerkUser = await getClerkClient().users.getUser(clerkUserId);
    const primaryEmail = clerkUser.emailAddresses.find(
      (entry) => entry.id === clerkUser.primaryEmailAddressId,
    );
    user = await usersRepository.provisionFromClerk({
      clerkId: clerkUserId,
      email: primaryEmail?.emailAddress ?? null,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    });
  }

  return { id: user.id, role: user.role };
}

/**
 * Require authenticated user via Clerk session JWT.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      next(new UnauthorizedError());
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Attach user from Clerk JWT when present; never fails. */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await resolveAuthUser(req);
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const key = req.header("x-admin-key");
  const expected = process.env.ADMIN_API_KEY;

  if (!expected || key !== expected) {
    next(new UnauthorizedError("Admin access required"));
    return;
  }

  next();
}
