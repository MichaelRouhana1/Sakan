export const MOBILE_PREFIXES = ["03", "70", "71", "76", "78", "79", "81"] as const;
export const LANDLINE_PREFIXES = ["01", "04", "05", "06", "07", "08", "09"] as const;

export type PhoneKind = "mobile" | "landline";

export type ContactNumber = {
  kind: PhoneKind;
  prefix: string;
  subscriber: string;
  e164: string;
  calls: boolean;
  whatsapp: boolean;
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

export function numberComplete(n: {
  kind: PhoneKind;
  prefix: string;
  subscriber: string;
  calls: boolean;
  whatsapp: boolean;
}): boolean {
  if (!toE164(n.kind, n.prefix, n.subscriber)) return false;
  if (n.kind === "landline") return n.calls;
  return n.calls || n.whatsapp;
}

export function deriveContactPhones(numbers: ContactNumber[]): {
  contactPhone: string | null;
  whatsappNumber: string | null;
} {
  const ready = numbers.filter(numberComplete);
  const contactPhone =
    ready.find((n) => n.calls)?.e164 ?? ready[0]?.e164 ?? null;
  const whatsappNumber =
    ready.find((n) => n.whatsapp && n.kind === "mobile")?.e164 ?? null;
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
