import {
  AsYouType,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";

export const MOBILE_PREFIXES = ["03", "70", "71", "76", "78", "79", "81"] as const;
export const LANDLINE_PREFIXES = ["01", "04", "05", "06", "07", "08", "09"] as const;

export type PhoneKind = "mobile" | "landline";
export type LebanonPrefix =
  | (typeof MOBILE_PREFIXES)[number]
  | (typeof LANDLINE_PREFIXES)[number];

export type ContactNumber = {
  id: string;
  country: string;
  /** National digits, without the country calling code. */
  national: string;
  calls: boolean;
  whatsapp: boolean;
  primary?: boolean;
  /** Present on numbers saved before international entry. */
  kind?: PhoneKind;
  prefix?: string;
  subscriber?: string;
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

function safeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const n = Math.floor(Math.random() * 16);
    return (c === "x" ? n : (n & 3) | 8).toString(16);
  });
}

const FALLBACK_COUNTRY_NAMES: Record<string, string> = {
  LB: "Lebanon",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  QA: "Qatar",
  KW: "Kuwait",
  JO: "Jordan",
  EG: "Egypt",
  SY: "Syria",
  IQ: "Iraq",
  CY: "Cyprus",
  TR: "Turkey",
  FR: "France",
  GB: "United Kingdom",
  DE: "Germany",
  IT: "Italy",
  ES: "Spain",
  US: "United States",
  CA: "Canada",
  AU: "Australia",
};

export function emptyContactNumber(): ContactNumber {
  return {
    id: safeUuid(),
    country: "LB",
    national: "",
    calls: true,
    whatsapp: false,
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

export function isFixedLine(n: ContactNumber): boolean {
  const digits = n.national.replace(/\D/g, "");
  if (n.country === "LB" && (LANDLINE_PREFIXES as readonly string[]).includes(digits.slice(0, 2))) {
    return true;
  }
  if (!n.country || !digits) return false;
  return parsePhoneNumberFromString(digits, n.country as CountryCode)?.getType() === "FIXED_LINE";
}

export function toE164(n: ContactNumber): string | null {
  const digits = n.national?.replace(/\D/g, "") ?? "";
  if (n.country && digits) {
    const parsed = parsePhoneNumberFromString(digits, n.country as CountryCode);
    if (parsed?.isValid()) return parsed.number;
  }
  if (n.kind && n.prefix && n.subscriber && isKnownPrefix(n.kind, n.prefix) && /^\d{6}$/.test(n.subscriber)) {
    return `+961${n.prefix.replace(/^0/, "")}${n.subscriber}`;
  }
  return null;
}

export function numberComplete(n: ContactNumber): boolean {
  if (!toE164(n)) return false;
  if (isFixedLine(n)) return n.calls && !n.whatsapp;
  return n.calls || n.whatsapp;
}

export function countryName(country: string): string {
  try {
    if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(country) ?? FALLBACK_COUNTRY_NAMES[country] ?? country;
    }
  } catch {
    // Fall through to static fallback on runtimes without Intl.DisplayNames (e.g. Hermes).
  }
  return FALLBACK_COUNTRY_NAMES[country] ?? country;
}

export function callingCode(country: string): string {
  try {
    return getCountryCallingCode(country as CountryCode);
  } catch {
    return "";
  }
}

export function formatForCountry(country: string, nationalDigits: string): string {
  const digits = nationalDigits.replace(/\D/g, "");
  if (!digits) return "";
  try {
    const parsed = parsePhoneNumberFromString(digits, country as CountryCode);
    if (parsed?.isValid()) return parsed.formatNational().replace(/^0(?=\d)/, "");
    return new AsYouType(country as CountryCode).input(digits);
  } catch {
    return digits;
  }
}

/** Longest national number the country accepts. */
export function maxNationalDigits(country: string): number {
  let max = 1;
  for (let length = 1; length <= 15; length += 1) {
    const result = validatePhoneNumberLength("8".repeat(length), country as CountryCode);
    if (result === "TOO_LONG") return Math.max(1, length - 1);
    if (result !== "INVALID_COUNTRY") max = length;
  }
  return max;
}

/** Grey hint inside the field, in the country's usual grouping. */
export function examplePlaceholder(country: string): string {
  try {
    const example = getExampleNumber(country as CountryCode, examples);
    if (!example) return "";
    return example.formatNational().replace(/^0/, "");
  } catch {
    return "";
  }
}

export type CountryChoice = { code: string; name: string; calling: string };

function foldName(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Name-prefix matches, then word-start matches. Dial codes match from the first digit. Lebanon is pinned only when the query is empty. */
export function rankCountryChoices(choices: CountryChoice[], query: string): CountryChoice[] {
  const raw = foldName(query.trim());
  if (!raw) {
    return [...choices].sort((a, b) => {
      if (a.code === "LB") return -1;
      if (b.code === "LB") return 1;
      return a.name.localeCompare(b.name);
    });
  }
  const codeQuery = /^\+?\d+$/.test(query.trim());
  const digits = query.trim().replace(/^\+/, "");
  const ranked: { choice: CountryChoice; rank: number }[] = [];
  for (const choice of choices) {
    if (codeQuery) {
      if (choice.calling.startsWith(digits)) ranked.push({ choice, rank: 0 });
      continue;
    }
    const name = foldName(choice.name);
    if (name.startsWith(raw)) ranked.push({ choice, rank: 0 });
    else if (name.split(/[^a-z0-9]+/).some((word) => word.startsWith(raw))) {
      ranked.push({ choice, rank: 1 });
    }
  }
  ranked.sort((a, b) => a.rank - b.rank || a.choice.name.localeCompare(b.choice.name));
  return ranked.map((row) => row.choice);
}

/** Digits from typed text. A pasted +E.164 for this country becomes the national number. */
export function nationalFromInput(country: string, raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(trimmed);
    if (parsed?.country === country) return parsed.nationalNumber;
  }
  let digits = trimmed.replace(/\D/g, "");
  try {
    const code = getCountryCallingCode(country as CountryCode);
    if (digits.startsWith(code) && digits.length > code.length + 6) {
      const parsed = parsePhoneNumberFromString(`+${digits}`);
      if (parsed?.country === country) digits = parsed.nationalNumber;
    }
  } catch {
    // Unknown country: keep the digits the user typed.
  }
  return digits.slice(0, 15);
}

export function phoneError(n: ContactNumber): string {
  return `Enter a valid number for ${countryName(n.country || "LB")}`;
}

export function samePhone(a: ContactNumber, b: ContactNumber): boolean {
  const left = toE164(a);
  const right = toE164(b);
  return Boolean(left && left === right);
}

export function normalizeContactNumber(raw: Partial<ContactNumber> & { e164?: string }): ContactNumber {
  const calls = raw.calls !== false;
  const whatsapp = Boolean(raw.whatsapp);
  const id = raw.id || "";
  if (raw.country && raw.national != null) {
    return { id, country: raw.country, national: String(raw.national).replace(/\D/g, ""), calls, whatsapp, primary: raw.primary };
  }
  if (raw.prefix && raw.subscriber) {
    return {
      id,
      country: "LB",
      national: `${raw.prefix}${raw.subscriber}`,
      calls,
      whatsapp,
      primary: raw.primary,
      kind: raw.kind,
      prefix: raw.prefix,
      subscriber: raw.subscriber,
    };
  }
  if (raw.e164) {
    const parsed = parsePhoneNumberFromString(raw.e164);
    if (parsed) {
      return {
        id,
        country: parsed.country ?? "LB",
        national: parsed.nationalNumber,
        calls,
        whatsapp,
        primary: raw.primary,
      };
    }
  }
  return { ...emptyContactNumber(), ...((id && { id }) || {}) };
}

/** Same id on two rows makes React reuse the first row, so a click cannot move the second. */
export function withUniqueIds(numbers: ContactNumber[]): ContactNumber[] {
  const seen = new Set<string>();
  return numbers.map((number, index) => {
    const base = number.id || `row-${index}-${number.country}-${number.national}`;
    if (!seen.has(base)) {
      seen.add(base);
      return { ...number, id: base };
    }
    const id = `${base}#${index}`;
    seen.add(id);
    return { ...number, id };
  });
}

/** Mark one row as primary and leave the others where they are. */
export function makePrimary(numbers: ContactNumber[], id: string): ContactNumber[] {
  if (!numbers.some((number) => number.id === id)) return numbers;
  return numbers.map((number) => ({ ...number, primary: number.id === id }));
}

/** One primary flag. The first row is primary when none is marked yet. */
export function ensureOnePrimary(numbers: ContactNumber[]): ContactNumber[] {
  const primaryAt = numbers.findIndex((number) => number.primary);
  const chosen = primaryAt >= 0 ? primaryAt : 0;
  return numbers.map((number, index) => ({ ...number, primary: index === chosen }));
}

export function toNationalDisplay(n: ContactNumber): string {
  if (n.country && n.national) return formatForCountry(n.country, n.national);
  const sub = formatSubscriber(n.subscriber ?? "");
  return sub ? `${n.prefix ?? ""} ${sub}` : (n.prefix ?? "");
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
        id: `legacy-${prefix}${d.slice(prefix.length)}`,
        country: "LB",
        national: `${prefix}${d.slice(prefix.length)}`,
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

const ALLOWED_PREFIXES: readonly string[] = [...MOBILE_PREFIXES, ...LANDLINE_PREFIXES];

/** True when these digits can still become a Lebanese mobile or landline. */
export function digitsAllowedSoFar(digits: string): boolean {
  if (!/^\d*$/.test(digits) || digits.length > 8) return false;
  if (digits.length === 0) return true;
  if (digits.length === 1) return ALLOWED_PREFIXES.some((prefix) => prefix.startsWith(digits));
  return ALLOWED_PREFIXES.includes(digits.slice(0, 2));
}

/** National digits from typed or pasted text. Null when the start is not an allowed prefix. */
export function normalizeTypedDigits(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00961")) digits = digits.slice(5);
  else if (digits.startsWith("961")) digits = digits.slice(3);
  digits = digits.slice(0, 8);
  return digitsAllowedSoFar(digits) ? digits : null;
}

export function formatNationalDigits(digits: string): string {
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)}`;
}

export function nationalDigits(n: ContactNumber): string {
  if (n.national) return n.national.replace(/\D/g, "");
  return n.subscriber ? `${n.prefix ?? ""}${n.subscriber}` : "";
}

export function contactFromDigits(prev: ContactNumber, digits: string): ContactNumber {
  const national = digits.replace(/\D/g, "").slice(0, 15);
  const next = { ...prev, country: prev.country || "LB", national };
  if (isFixedLine(next)) return { ...next, calls: true, whatsapp: false };
  return next;
}

export function sameLebanonNumber(a: ContactNumber, b: ContactNumber): boolean {
  const left = toE164(a);
  const right = toE164(b);
  return Boolean(left && left === right);
}

export function serializeContactNumber(n: ContactNumber) {
  const normalized = normalizeContactNumber(n);
  const e164 = toE164(normalized);
  if (!e164 || !numberComplete(normalized)) return null;
  const fixed = isFixedLine(normalized);
  return {
    country: normalized.country,
    national: normalized.national,
    e164,
    calls: fixed ? true : normalized.calls,
    whatsapp: fixed ? false : normalized.whatsapp,
    primary: Boolean(normalized.primary),
  };
}

export function deriveContactPhones(numbers: ContactNumber[]): {
  contactPhone: string | null;
  whatsappNumber: string | null;
} {
  const ready = numbers
    .map((n) => ({ n, e164: toE164(n) }))
    .filter((x): x is { n: ContactNumber; e164: string } => x.e164 != null && numberComplete(x.n));
  const contactPhone = (ready.find((x) => x.n.primary) ?? ready[0])?.e164 ?? null;
  const whatsappNumber =
    ready.find((x) => x.n.whatsapp && !isFixedLine(x.n))?.e164 ?? null;
  return { contactPhone, whatsappNumber };
}

export function numbersFromLegacy(input: {
  contactNumbers?: ContactNumber[];
  contactPhone?: string;
  whatsappNumber?: string;
  whatsappSameAsPhone?: boolean;
}): ContactNumber[] {
  if (input.contactNumbers && input.contactNumbers.length > 0) {
    return ensureOnePrimary(withUniqueIds(
      input.contactNumbers.slice(0, MAX_CONTACT_NUMBERS).map((n) => normalizeContactNumber(n)),
    ));
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
