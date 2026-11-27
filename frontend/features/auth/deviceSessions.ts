export type DeviceKind = "phone" | "computer";

export type ClerkSessionActivityLike = {
  id?: string;
  browserName?: string | null;
  browserVersion?: string | null;
  deviceType?: string | null;
  isMobile?: boolean | null;
  city?: string | null;
  country?: string | null;
};

export type ClerkSessionWithActivitiesLike = {
  id: string;
  status?: string | null;
  lastActiveAt?: Date | string | number | null;
  latestActivity?: ClerkSessionActivityLike | null;
  revoke: () => Promise<unknown>;
};

export type DeviceSessionItem = {
  id: string;
  isCurrent: boolean;
  kind: DeviceKind;
  title: string;
  location: string | null;
  lastActiveLabel: string | null;
  metaLine: string;
  lastActiveMs: number;
  raw: ClerkSessionWithActivitiesLike;
};

const INACTIVE_STATUSES = new Set([
  "revoked",
  "ended",
  "removed",
  "replaced",
  "abandoned",
  "expired",
]);

const MOBILE_DEVICE_RE = /\b(iphone|ipad|ipod|ios|android|mobile|phone|tablet)\b/i;
const RAW_NATIVE_CLIENT_RE = /^(okhttp|cfnetwork|darwin|dalvik|react[\s-]?native|expo)$/i;

function cleanToken(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(unknown|null|undefined|n\/a)$/i.test(trimmed)) return null;
  return trimmed;
}

export function getDeviceKind(
  activity?: ClerkSessionActivityLike | null,
): DeviceKind {
  if (activity?.isMobile === true) return "phone";
  const device = cleanToken(activity?.deviceType);
  if (device && MOBILE_DEVICE_RE.test(device)) return "phone";
  return "computer";
}

export function formatDeviceOs(
  activity?: ClerkSessionActivityLike | null,
): string | null {
  const raw = cleanToken(activity?.deviceType);
  if (!raw) return null;
  if (/^(macintosh|mac\s*os(\s*x)?|macos)$/i.test(raw)) return "macOS";
  if (/^(cros|chrome\s*os)$/i.test(raw)) return "ChromeOS";
  if (/^windows/i.test(raw)) return "Windows";
  if (/^ios$/i.test(raw)) return "iOS";
  if (/^iphone$/i.test(raw)) return "iPhone";
  if (/^ipad$/i.test(raw)) return "iPad";
  if (/^android$/i.test(raw)) return "Android";
  if (/^linux$/i.test(raw)) return "Linux";
  return raw;
}

export function formatBrowserName(
  activity?: ClerkSessionActivityLike | null,
): string | null {
  const raw = cleanToken(activity?.browserName);
  if (!raw) return null;
  if (RAW_NATIVE_CLIENT_RE.test(raw)) return null;
  if (/^mobile\s+safari$/i.test(raw)) return "Safari";
  if (/^chrome\s+mobile(\s+webview|\s+ios)?$/i.test(raw)) return "Chrome";
  if (/^firefox\s+mobile$/i.test(raw)) return "Firefox";
  if (/^edge\s+mobile$/i.test(raw)) return "Edge";
  return raw;
}

export function formatDeviceTitle(
  activity?: ClerkSessionActivityLike | null,
): string {
  const os = formatDeviceOs(activity);
  const browser = formatBrowserName(activity);

  if (os && browser) {
    if (os.toLowerCase() === browser.toLowerCase()) return os;
    return `${os} · ${browser}`;
  }
  if (os) return os;
  if (browser) return browser;
  return getDeviceKind(activity) === "phone" ? "Mobile device" : "Unknown device";
}

export function formatSessionLocation(
  activity?: ClerkSessionActivityLike | null,
): string | null {
  const city = cleanToken(activity?.city);
  const country = cleanToken(activity?.country);
  if (city && country) {
    if (city.toLowerCase() === country.toLowerCase()) return city;
    return `${city}, ${country}`;
  }
  return city ?? country ?? null;
}

function toValidDate(value?: Date | string | number | null): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLastActive(
  value?: Date | string | number | null,
  now: Date = new Date(),
  locale?: string,
): string | null {
  const date = toValidDate(value);
  if (!date) return null;

  const sameYear = date.getFullYear() === now.getFullYear();
  const datePart = date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const timePart = date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} at ${timePart}`;
}

export function formatSessionMeta(
  activity: ClerkSessionActivityLike | null | undefined,
  lastActiveAt: Date | string | number | null | undefined,
  now: Date = new Date(),
  locale?: string,
): { location: string | null; lastActiveLabel: string | null; metaLine: string } {
  const location = formatSessionLocation(activity);
  const lastActiveLabel = formatLastActive(lastActiveAt, now, locale);
  const parts = [location, lastActiveLabel].filter(Boolean) as string[];
  return {
    location,
    lastActiveLabel,
    metaLine: parts.length > 0 ? parts.join(" · ") : "Active session",
  };
}

export function normalizeDeviceSessions(
  rawSessions: readonly ClerkSessionWithActivitiesLike[],
  currentSessionId: string | null | undefined,
  now: Date = new Date(),
  locale?: string,
): DeviceSessionItem[] {
  const active = rawSessions.filter((session) => {
    const status = session.status?.toLowerCase();
    return !status || !INACTIVE_STATUSES.has(status);
  });

  const mapped: DeviceSessionItem[] = active.map((session) => {
    const activity = session.latestActivity ?? null;
    const isCurrent = Boolean(currentSessionId && session.id === currentSessionId);
    const kind = getDeviceKind(activity);
    const title = formatDeviceTitle(activity);
    const { location, lastActiveLabel, metaLine } = formatSessionMeta(
      activity,
      session.lastActiveAt,
      now,
      locale,
    );
    const date = toValidDate(session.lastActiveAt);

    return {
      id: session.id,
      isCurrent,
      kind,
      title,
      location,
      lastActiveLabel,
      metaLine,
      lastActiveMs: date ? date.getTime() : -1,
      raw: session,
    };
  });

  return mapped.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    if (a.lastActiveMs !== b.lastActiveMs) return b.lastActiveMs - a.lastActiveMs;
    return a.id.localeCompare(b.id);
  });
}

export function loggedOutToastTitle(deviceTitle: string): string {
  return `Logged out of ${deviceTitle}`;
}
