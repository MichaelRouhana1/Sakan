import { verifyToken } from "@clerk/backend";
import type { NextFunction, Request, Response } from "express";
import { isUsableClerkSecret, loadEnv } from "../config/env.js";
import { AppError, ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import { getClerkClient, getClerkSecretKey } from "../lib/clerk.js";
import { usersRepository } from "../modules/users/users.repository.js";

/** Auth context for authenticated users. */
export type AuthUser = {
  id: string;
  role: "renter" | "poster";
  clerkId: string;
};

export type AdminActor = {
  kind: "clerk" | "api_key";
  clerkId: string | null;
  userId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      admin?: AdminActor;
    }
  }
}

function bearerToken(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

function adminApiKeyValid(req: Request): boolean {
  const key = req.header("x-admin-key");
  const expected = loadEnv().ADMIN_API_KEY;
  return Boolean(expected && key && key === expected);
}

function parseAdminClerkIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

async function isStaffAdmin(clerkId: string): Promise<boolean> {
  const allow = parseAdminClerkIds(loadEnv().ADMIN_CLERK_IDS);
  if (allow.includes(clerkId)) return true;

  try {
    const clerkUser = await getClerkClient().users.getUser(clerkId);
    return clerkUser.publicMetadata?.skounAdmin === true;
  } catch {
    return false;
  }
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

  return { id: user.id, role: user.role, clerkId: clerkUserId };
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

/**
 * Admin: Clerk staff JWT (allowlist or publicMetadata.skounAdmin) or x-admin-key.
 * If both sent, staff Clerk identity wins for audit.
 */
export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await resolveAuthUser(req);
    if (user) {
      req.user = user;
      if (await isStaffAdmin(user.clerkId)) {
        req.admin = {
          kind: "clerk",
          clerkId: user.clerkId,
          userId: user.id,
        };
        next();
        return;
      }
      if (!adminApiKeyValid(req)) {
        next(new ForbiddenError("Admin access required"));
        return;
      }
    }

    if (adminApiKeyValid(req)) {
      req.admin = { kind: "api_key", clerkId: null, userId: null };
      next();
      return;
    }

    next(new UnauthorizedError("Admin access required"));
  } catch (err) {
    next(err);
  }
}
