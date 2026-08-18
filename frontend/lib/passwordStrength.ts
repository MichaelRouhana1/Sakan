export const PASSWORD_MIN_LEN = 8;

export type PasswordCheckKey =
  | "length"
  | "lower"
  | "upper"
  | "number"
  | "special";

export type PasswordTier = "empty" | "weak" | "better" | "strong";

export type PasswordChecks = Record<PasswordCheckKey, boolean>;

const SPECIAL_RE = /[^A-Za-z0-9]/;

export const PASSWORD_CHECK_LABELS: Record<PasswordCheckKey, string> = {
  length: `At least ${PASSWORD_MIN_LEN} characters`,
  lower: "A lowercase letter",
  upper: "An uppercase letter",
  number: "A number",
  special: "A special character (!@#$…)",
};

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= PASSWORD_MIN_LEN,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: SPECIAL_RE.test(password),
  };
}

export function passwordMeetsPolicy(password: string): boolean {
  const c = getPasswordChecks(password);
  return c.length && c.lower && c.upper && c.number && c.special;
}

export function getPasswordTier(password: string): PasswordTier {
  if (!password) return "empty";
  const c = getPasswordChecks(password);
  const classes = [c.lower, c.upper, c.number, c.special].filter(Boolean).length;
  if (!c.length || classes <= 1) return "weak";
  if (classes < 4) return "better";
  return "strong";
}

export function passwordMismatch(password: string, confirm: string): boolean {
  return confirm.length > 0 && password !== confirm;
}
