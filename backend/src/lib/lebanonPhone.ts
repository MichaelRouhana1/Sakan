import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export const MOBILE_PREFIXES = ["03", "70", "71", "76", "78", "79", "81"] as const;
export const LANDLINE_PREFIXES = ["01", "04", "05", "06", "07", "08", "09"] as const;

export type PhoneKind = "mobile" | "landline";

export type ContactNumber = {
  kind?: PhoneKind;
  prefix?: string;
  subscriber?: string;
  country?: string;
  national?: string;
  e164: string;
  calls: boolean;
  whatsapp: boolean;
  primary?: boolean;
};

const PREFIXES = {
  mobile: MOBILE_PREFIXES,
  landline: LANDLINE_PREFIXES,
} as const;

export function toE164(kind: PhoneKind, prefix: string, subscriber: string): string | null {
  if (!(PREFIXES[kind] as readonly string[]).includes(prefix)) return null;
  if (!/^\d{6}$/.test(subscriber)) return null;
  return `+961${prefix.replace(/^0/, "")}${subscriber}`;
}

export function canonicalE164(n: {
  e164?: string;
  country?: string;
  national?: string;
  kind?: PhoneKind;
  prefix?: string;
  subscriber?: string;
}): string | null {
  if (n.country && n.national) {
    const parsed = parsePhoneNumberFromString(n.national, n.country as CountryCode);
    if (parsed?.isValid()) return parsed.number;
  }
  if (n.kind && n.prefix && n.subscriber) {
    const legacy = toE164(n.kind, n.prefix, n.subscriber);
    if (legacy) return legacy;
  }
  if (n.e164) {
    const parsed = parsePhoneNumberFromString(n.e164);
    if (parsed?.isValid()) return parsed.number;
  }
  return null;
}

export function numberComplete(n: ContactNumber): boolean {
  if (!canonicalE164(n) || n.e164 !== canonicalE164(n)) return false;
  const parsed = parsePhoneNumberFromString(n.e164);
  const lebaneseLandline = parsed?.country === "LB" && n.kind === "landline";
  if (parsed?.getType() === "FIXED_LINE" || lebaneseLandline) return n.calls && !n.whatsapp;
  return n.calls || n.whatsapp;
}

export function deriveContactPhones(numbers: ContactNumber[]): {
  contactPhone: string | null;
  whatsappNumber: string | null;
} {
  const ready = numbers.filter(numberComplete);
  const ordered = [...ready].sort((a, b) => Number(b.primary) - Number(a.primary));
  const contactPhone = ordered[0]?.e164 ?? null;
  const whatsappNumber =
    ready.find((n) => n.whatsapp && n.kind !== "landline")?.e164 ?? null;
  return { contactPhone, whatsappNumber };
}

export function resolveContactNumbers(input: {
  contactNumbers?: ContactNumber[];
  contactPhone?: string | null;
  whatsappNumber?: string | null;
}): ContactNumber[] {
  const fromArray = (input.contactNumbers ?? []).filter(numberComplete).slice(0, 4);
  if (fromArray.length) return fromArray;
  return [];
}
