import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";

const MIN_LENGTH = 12;
const UPPER = /[A-Z]/;
const LOWER = /[a-z]/;
const DIGIT = /\d/;
const SPECIAL = /[^A-Za-z0-9]/;

const zxcvbn = new ZxcvbnFactory({
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
  },
});

export type PasswordChecks = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
};

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Weak" | "Medium" | "Strong";
  checks: PasswordChecks;
  policyMet: boolean;
  /** Strong enough to submit: policy + zxcvbn score >= 3 */
  isStrong: boolean;
};

export function evaluatePasswordStrength(
  password: string,
  userInputs: string[] = [],
): PasswordStrength {
  const checks: PasswordChecks = {
    minLength: password.length >= MIN_LENGTH,
    uppercase: UPPER.test(password),
    lowercase: LOWER.test(password),
    number: DIGIT.test(password),
    special: SPECIAL.test(password),
  };
  const policyMet = Object.values(checks).every(Boolean);

  const result = password
    ? zxcvbn.check(password, userInputs.filter(Boolean))
    : { score: 0 as const };
  const score = result.score as 0 | 1 | 2 | 3 | 4;

  let label: PasswordStrength["label"] = "Weak";
  if (policyMet && score >= 3) label = "Strong";
  else if (policyMet || score >= 2) label = "Medium";

  return {
    score,
    label,
    checks,
    policyMet,
    isStrong: policyMet && score >= 3,
  };
}

export const PASSWORD_MIN_LENGTH = MIN_LENGTH;
