export const MOBILE_PREFIXES = ["03", "70", "71", "76", "78", "79", "81"] as const;
export const LANDLINE_PREFIXES = ["01", "04", "05", "06", "07", "08", "09"] as const;

export type PhoneKind = "mobile" | "landline";
export type LebanonPrefix =
  | (typeof MOBILE_PREFIXES)[number]
  | (typeof LANDLINE_PREFIXES)[number];

export type ContactNumber = {
  kind: PhoneKind;
  prefix: string;
  subscriber: string;
  calls: boolean;
  whatsapp: boolean;
};

export const MAX_CONTACT_NUMBERS = 4;

export const LANDLINE_PREFIX_HINT: Record<(typeof LANDLINE_PREFIXES)[number], string> = {
  "01": "Beirut",
  "04": "Mount Leb.",
  "05": "Aley / Chouf",
  "06": "North",
  "07": "South",
  "08": "Bekaa",
  "09": "Keserwan",
};

export function prefixesFor(kind: PhoneKind): readonly string[] {
  return kind === "landline" ? LANDLINE_PREFIXES : MOBILE_PREFIXES;
}

export function emptyContactNumber(kind: PhoneKind = "mobile"): ContactNumber {
  return {
    kind,
    prefix: kind === "landline" ? "01" : "71",
    subscriber: "",
    calls: true,
    whatsapp: kind === "mobile",
  };
}

export function sanitizeSubscriber(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function formatSubscriber(raw: string): string {
  const d = sanitizeSubscriber(raw);
  if (d.length <= 3) return d;
  return `${d.slice(0, 3)} ${d.slice(3)}`;
}

export function isKnownPrefix(kind: PhoneKind, prefix: string): boolean {
  return prefixesFor(kind).includes(prefix);
}

export function numberComplete(n: ContactNumber): boolean {
  if (!isKnownPrefix(n.kind, n.prefix)) return false;
  if (!/^\d{6}$/.test(n.subscriber)) return false;
  if (n.kind === "landline") return n.calls;
  return n.calls || n.whatsapp;
}

export function toE164(n: ContactNumber): string | null {
  if (!isKnownPrefix(n.kind, n.prefix) || !/^\d{6}$/.test(n.subscriber)) {
    return null;
  }
  return `+961${n.prefix.replace(/^0/, "")}${n.subscriber}`;
}

export function toNationalDisplay(n: ContactNumber): string {
  const sub = formatSubscriber(n.subscriber);
  return sub ? `${n.prefix} ${sub}` : n.prefix;
}

export function parseLebanonNumber(raw: string): ContactNumber | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("961")) d = d.slice(3);
  if (d.length === 7) d = `0${d}`;
  const all = [...MOBILE_PREFIXES, ...LANDLINE_PREFIXES].sort(
    (a, b) => b.length - a.length,
  );
  for (const prefix of all) {
    if (d.startsWith(prefix) && d.length === prefix.length + 6) {
      const kind: PhoneKind = (MOBILE_PREFIXES as readonly string[]).includes(
        prefix,
      )
        ? "mobile"
        : "landline";
      return {
        kind,
        prefix,
        subscriber: d.slice(prefix.length),
        calls: true,
        whatsapp: kind === "mobile",
      };
    }
  }
  return null;
}

export function serializeContactNumber(n: ContactNumber) {
  const e164 = toE164(n);
  if (!e164 || !numberComplete(n)) return null;
  return {
    kind: n.kind,
    prefix: n.prefix,
    subscriber: n.subscriber,
    e164,
    calls: n.calls,
    whatsapp: n.kind === "mobile" && n.whatsapp,
  };
}

export function deriveContactPhones(numbers: ContactNumber[]): {
  contactPhone: string | null;
  whatsappNumber: string | null;
} {
  const ready = numbers
    .map((n) => ({ n, e164: toE164(n) }))
    .filter((x): x is { n: ContactNumber; e164: string } => x.e164 != null && numberComplete(x.n));
  const contactPhone =
    ready.find((x) => x.n.calls)?.e164 ?? ready[0]?.e164 ?? null;
  const whatsappNumber =
    ready.find((x) => x.n.whatsapp && x.n.kind === "mobile")?.e164 ?? null;
  return { contactPhone, whatsappNumber };
}

export function numbersFromLegacy(input: {
  contactNumbers?: ContactNumber[];
  contactPhone?: string;
  whatsappNumber?: string;
  whatsappSameAsPhone?: boolean;
}): ContactNumber[] {
  if (input.contactNumbers && input.contactNumbers.length > 0) {
    return input.contactNumbers.slice(0, MAX_CONTACT_NUMBERS);
  }
  const phone = input.contactPhone ? parseLebanonNumber(input.contactPhone) : null;
  if (!phone) return [emptyContactNumber()];
  const same = input.whatsappSameAsPhone !== false;
  if (same || !input.whatsappNumber) {
    return [{ ...phone, calls: true, whatsapp: phone.kind === "mobile" }];
  }
  const wa = parseLebanonNumber(input.whatsappNumber);
  if (!wa || toE164(wa) === toE164(phone)) {
    return [{ ...phone, calls: true, whatsapp: phone.kind === "mobile" }];
  }
  return [
    { ...phone, calls: true, whatsapp: false },
    { ...wa, calls: false, whatsapp: wa.kind === "mobile" },
  ];
}
