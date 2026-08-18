import { Router } from "express";
import { getClerkClient } from "../../lib/clerk.js";
import { ForbiddenError, ValidationError } from "../../lib/errors.js";
import { loadEnv } from "../../config/env.js";

function passwordMeetsPolicy(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export const authDevRouter = Router();

/** Dev-only: Clerk dashboard min_length is 15; our UI is 8. Skip Clerk length check. */
authDevRouter.post("/dev-set-password", async (req, res, next) => {
  try {
    if (loadEnv().NODE_ENV === "production") {
      throw new ForbiddenError();
    }
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !passwordMeetsPolicy(password)) {
      throw new ValidationError(
        "Use 8+ characters with upper, lower, number, and a special character.",
      );
    }

    const clerk = getClerkClient();
    const { data } = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 5,
    });
    if (data.length > 1) {
      throw new ValidationError("No matching sign-up found for that email.");
    }
    const user = data[0];
    if (user) {
      if (user.passwordEnabled) {
        throw new ValidationError("Password already set. Sign in instead.");
      }
      if ((user.externalAccounts?.length ?? 0) > 0) {
        throw new ForbiddenError();
      }
      await clerk.users.updateUser(user.id, {
        password,
        skipPasswordChecks: true,
      });
    } else {
      await clerk.users.createUser({
        emailAddress: [email],
        password,
        skipPasswordChecks: true,
      });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
