import { randomBytes } from "node:crypto";

/** Human-shareable Whish/OMT reference, e.g. SKN-A1B2C3D4 */
export function generateReferenceId(prefix = "SKN"): string {
  const token = randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${token}`;
}
