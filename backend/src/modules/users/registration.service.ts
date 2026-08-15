import { getRegistrationSecret } from "../../config/env.js";
import {
  generateNumericCode,
  generateOpaqueToken,
  hashWithSecret,
  normalizeEmail,
  safeEqualHex,
} from "../../lib/crypto-tokens.js";
import { AppError, ConflictError, ValidationError } from "../../lib/errors.js";
import { sendEmail } from "../../lib/mailer.js";
import {
  assertStrongPassword,
  hashPassword,
  verifyPassword,
} from "../../lib/password.js";
import {
  CODE_TTL_MS,
  COMPLETION_TOKEN_TTL_MS,
  MAX_CODE_ATTEMPTS,
  MAX_SENDS_PER_WINDOW,
  RESEND_COOLDOWN_MS,
  SEND_WINDOW_MS,
} from "./registration.constants.js";
import { registrationRepository } from "./registration.repository.js";
import { universitiesService } from "../universities/universities.service.js";
import { toPublicUser } from "./users.public.js";
import { usersRepository } from "./users.repository.js";
import { usersService } from "./users.service.js";
import type {
  CompleteRegistrationInput,
  LoginWithPasswordInput,
  RequestRegistrationCodeInput,
  VerifyRegistrationCodeInput,
} from "./users.schemas.js";

function codeHashFor(email: string, code: string): string {
  const secret = getRegistrationSecret();
  return hashWithSecret(secret, "registration-code", `${email}:${code}`);
}

function completionHashFor(token: string): string {
  const secret = getRegistrationSecret();
  return hashWithSecret(secret, "registration-completion", token);
}

export class RegistrationService {
  async requestCode(input: RequestRegistrationCodeInput) {
    const email = normalizeEmail(input.email);
    const existingUser = await usersRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError(
        "An account with this email already exists. Please sign in.",
      );
    }

    const now = Date.now();
    const existing = await registrationRepository.findLatestOpenChallenge(email);

    if (existing) {
      const sinceLast = now - existing.lastSentAt.getTime();
      if (sinceLast < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - sinceLast) / 1000);
        throw new AppError(
          429,
          `Please wait ${waitSec}s before requesting another code.`,
          "RESEND_COOLDOWN",
        );
      }

      const windowStart = now - SEND_WINDOW_MS;
      if (
        existing.createdAt.getTime() >= windowStart &&
        existing.sendCount >= MAX_SENDS_PER_WINDOW
      ) {
        throw new AppError(
          429,
          "Too many verification emails. Try again later.",
          "RESEND_LIMIT",
        );
      }
    }

    const code = generateNumericCode(6);
    const hash = codeHashFor(email, code);
    const expiresAt = new Date(now + CODE_TTL_MS);
    const lastSentAt = new Date(now);

    if (existing && !existing.verifiedAt) {
      await registrationRepository.resetChallengeCode(existing.id, {
        codeHash: hash,
        expiresAt,
        lastSentAt,
        sendCount: existing.sendCount + 1,
      });
    } else if (existing?.verifiedAt && !existing.consumedAt) {
      // Already verified — allow resend only by creating a fresh unverified challenge.
      await registrationRepository.createChallenge({
        email,
        codeHash: hash,
        expiresAt,
        lastSentAt,
      });
    } else {
      await registrationRepository.createChallenge({
        email,
        codeHash: hash,
        expiresAt,
        lastSentAt,
      });
    }

    let delivery;
    try {
      delivery = await sendEmail({
        to: email,
        subject: "Your Skoun verification code",
        text: [
          "Your Skoun email verification code is:",
          "",
          code,
          "",
          "This code expires in 10 minutes.",
          "If you did not request this, you can ignore this email.",
        ].join("\n"),
        html: `<p>Your Skoun email verification code is:</p><p style="font-size:24px;letter-spacing:4px;"><strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Resend free/testing: only account-owner inbox is allowed until a domain is verified.
      if (
        /only send testing emails to your own email address/i.test(message) ||
        /verify a domain/i.test(message)
      ) {
        throw new AppError(
          400,
          "This email cannot receive codes yet with the current email provider setup. Use the email linked to your Resend account, or verify a sending domain at resend.com/domains.",
          "EMAIL_RECIPIENT_NOT_ALLOWED",
        );
      }
      if (/Resend rejected/i.test(message) || /SMTP/i.test(message)) {
        throw new AppError(
          502,
          "Could not send verification email. Please try again in a moment.",
          "EMAIL_SEND_FAILED",
        );
      }
      throw err;
    }

    return {
      email,
      expiresInSeconds: Math.floor(CODE_TTL_MS / 1000),
      resendCooldownSeconds: Math.floor(RESEND_COOLDOWN_MS / 1000),
      deliveryMode: delivery.deliveryMode,
      ...(delivery.deliveryMode === "outbox"
        ? {
            deliveryWarning:
              "Email API not configured. Code was saved to the server outbox (backend/.email-outbox), not your inbox. Add RESEND_API_KEY or SMTP_* to backend/.env for real delivery.",
            outboxHint: delivery.outboxHint,
          }
        : {}),
    };
  }

  async verifyCode(input: VerifyRegistrationCodeInput) {
    const email = normalizeEmail(input.email);
    const code = input.code.trim();

    const existingUser = await usersRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError(
        "An account with this email already exists. Please sign in.",
      );
    }

    const challenge = await registrationRepository.findLatestOpenChallenge(email);
    if (!challenge) {
      throw new ValidationError(
        "No verification request found. Request a new code.",
      );
    }

    if (challenge.verifiedAt && challenge.completionTokenHash) {
      throw new ValidationError(
        "Email already verified. Continue creating your account.",
      );
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new ValidationError(
        "Verification code expired. Request a new code.",
      );
    }

    if (challenge.attemptCount >= MAX_CODE_ATTEMPTS) {
      throw new AppError(
        429,
        "Too many incorrect attempts. Request a new code.",
        "CODE_ATTEMPTS_EXCEEDED",
      );
    }

    const expected = challenge.codeHash;
    const actual = codeHashFor(email, code);
    if (!safeEqualHex(expected, actual)) {
      await registrationRepository.incrementAttempt(challenge.id);
      throw new ValidationError("Incorrect verification code.");
    }

    const completionToken = generateOpaqueToken(32);
    const completionTokenHash = completionHashFor(completionToken);
    const completionTokenExpiresAt = new Date(
      Date.now() + COMPLETION_TOKEN_TTL_MS,
    );

    await registrationRepository.markVerified(challenge.id, {
      completionTokenHash,
      completionTokenExpiresAt,
      // Replace OTP hash so the plaintext code can never verify again.
      consumedCodeHash: hashWithSecret(
        getRegistrationSecret(),
        "registration-code-used",
        `${email}:${challenge.id}:${Date.now()}`,
      ),
    });

    return {
      email,
      completionToken,
      expiresInSeconds: Math.floor(COMPLETION_TOKEN_TTL_MS / 1000),
    };
  }

  async complete(input: CompleteRegistrationInput) {
    assertStrongPassword(input.password);
    if (input.password !== input.confirmPassword) {
      throw new ValidationError("Passwords do not match");
    }

    const tokenHash = completionHashFor(input.completionToken);
    const challenge =
      await registrationRepository.findByCompletionTokenHash(tokenHash);
    if (!challenge || !challenge.verifiedAt) {
      throw new AppError(
        403,
        "Email verification required before creating an account.",
        "EMAIL_NOT_VERIFIED",
      );
    }

    const email = challenge.email;
    const existingUser = await usersRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError(
        "An account with this email already exists. Please sign in.",
      );
    }

    const firstName = input.firstName.trim().replace(/\s+/g, " ");
    const lastName = input.lastName.trim().replace(/\s+/g, " ");
    if (!firstName || !lastName) {
      throw new ValidationError("First and last name are required");
    }

    const campus = await universitiesService.requireActiveCampus(input.campusId);

    const passwordHash = await hashPassword(input.password);
    const user = await usersRepository.createEmailUser({
      email,
      passwordHash,
      firstName,
      lastName,
      dateOfBirth: input.dateOfBirth,
      role: input.role ?? "renter",
      emailVerifiedAt: challenge.verifiedAt,
      campusId: campus.id,
    });

    await registrationRepository.consumeChallenge(challenge.id);

    return usersService.withCampus(toPublicUser(user));
  }

  async login(input: LoginWithPasswordInput) {
    const email = normalizeEmail(input.email);
    const user = await usersRepository.findByEmail(email);
    if (!user?.passwordHash || !user.emailVerifiedAt) {
      throw new AppError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
    }

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw new AppError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
    }

    if (user.accountStatus === "banned") {
      throw new AppError(403, "This account has been banned.", "ACCOUNT_BANNED");
    }

    return usersService.withCampus(toPublicUser(user));
  }
}

export const registrationService = new RegistrationService();
