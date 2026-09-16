import { randomBytes } from "node:crypto";

/** Human-shareable Whish reference, e.g. SKN-A1B2C3D4 */
export function generateReferenceId(prefix = "SKN"): string {
  const token = randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${token}`;
}

/** Numeric id Whish expects as `externalId` (safe integer as a string). */
export function generateProviderExternalId(): string {
  const timestamp = Date.now();
  const extra = randomBytes(2).readUInt16BE(0) % 1000;
  return String(timestamp * 1000 + extra);
}
