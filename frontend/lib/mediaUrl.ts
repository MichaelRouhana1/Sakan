import { API_BASE_URL } from "@/lib/api";

/**
 * Make listing / upload media URLs reachable on a physical device.
 * Seeds and older rows often store `http://localhost:3001/uploads/...` or a
 * stale LAN IP — rewrite those onto the live API origin while leaving
 * third-party https URLs alone.
 */
export function resolveMediaUrl(
  url: string | null | undefined,
): string | null {
  if (url == null) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("/assets/")) {
    return `${API_BASE_URL}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/uploads/")) {
      const base = new URL(API_BASE_URL);
      return `${base.origin}${parsed.pathname}${parsed.search}`;
    }
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1"
    ) {
      const base = new URL(API_BASE_URL);
      parsed.protocol = base.protocol;
      parsed.host = base.host;
      return parsed.toString();
    }
  } catch {
    // Not an absolute URL — return as-is.
  }

  return trimmed;
}

export function resolveMediaUrls(
  urls: Array<string | null | undefined>,
): string[] {
  return urls
    .map((url) => resolveMediaUrl(url))
    .filter((url): url is string => Boolean(url));
}
