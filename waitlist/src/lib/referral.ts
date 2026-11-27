import { customAlphabet } from "./nanoid";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generate = customAlphabet(alphabet, 8);

export function createReferralCode(): string {
  return generate();
}

export function buildReferralUrl(code: string, role: "student" | "landlord") {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const path = role === "landlord" ? "/landlords" : "/";
  return `${base}${path}?ref=${encodeURIComponent(code)}`;
}
