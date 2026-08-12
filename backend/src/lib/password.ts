import bcrypt from "bcryptjs";
import { ValidationError } from "./errors.js";

const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 12;

const UPPER = /[A-Z]/;
const LOWER = /[a-z]/;
const DIGIT = /\d/;
const SPECIAL = /[^A-Za-z0-9]/;

export type PasswordPolicyResult = {
  ok: boolean;
  errors: string[];
  checks: {
    minLength: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
};

export function evaluatePasswordPolicy(password: string): PasswordPolicyResult {
  const checks = {
    minLength: password.length >= MIN_PASSWORD_LENGTH,
    uppercase: UPPER.test(password),
    lowercase: LOWER.test(password),
    number: DIGIT.test(password),
    special: SPECIAL.test(password),
  };
  const errors: string[] = [];
  if (!checks.minLength) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (!checks.uppercase) errors.push("Password must include an uppercase letter");
  if (!checks.lowercase) errors.push("Password must include a lowercase letter");
  if (!checks.number) errors.push("Password must include a number");
  if (!checks.special) errors.push("Password must include a special character");
  return { ok: errors.length === 0, errors, checks };
}

export function assertStrongPassword(password: string): void {
  const result = evaluatePasswordPolicy(password);
  if (!result.ok) {
    throw new ValidationError(result.errors[0] ?? "Password is too weak");
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
