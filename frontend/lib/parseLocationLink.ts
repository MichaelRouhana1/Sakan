import type { LatLng } from "@/lib/locationWkt";

const SHORT_LINK_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "g.co",
]);

// #region agent log
const DEBUG_LOG_URLS = [
  "http://127.0.0.1:7480/ingest/c819fe4b-ee03-4efd-a623-2ff9add46ee7",
  "http://192.168.10.249:7480/ingest/c819fe4b-ee03-4efd-a623-2ff9add46ee7",
  `${process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.10.249:3001"}/api/debug-session-log`,
];
function dbg(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  const payload = JSON.stringify({
    sessionId: "b50488",
    runId: "maps-link-postfix",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  });
  for (const u of DEBUG_LOG_URLS) {
    fetch(u, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "b50488",
      },
      body: payload,
    }).catch(() => {});
  }
}
// #endregion

/** Pull first http(s) or geo: URL from WhatsApp / share paste blobs. */
export function extractUrlFromPaste(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const http = trimmed.match(/https?:\/\/[^\s<>"']+/i);
  if (http) {
    return http[0].replace(/[.,;:!?)\]}>]+$/g, "");
  }
  const geo = trimmed.match(/geo:[^\s<>"']+/i);
  if (geo) {
    return geo[0].replace(/[.,;:!?)\]}>]+$/g, "");
  }
  return null;
}

function parsePair(a: string, b: string): LatLng | null {
  const lat = Number(a);
  const lng = Number(b);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/**
 * Extract WGS84 lat/lng from a Maps / geo URL (already expanded if short).
 * Does not hit the network.
 */
export function parseCoordsFromLocationUrl(urlStr: string): LatLng | null {
  const raw = urlStr.trim();
  if (!raw) return null;

  // geo:lat,lng or geo:0,0?q=lat,lng
  if (/^geo:/i.test(raw)) {
    const body = raw.slice(4);
    const qMatch = body.match(/[?&]q=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
    if (qMatch) return parsePair(qMatch[1], qMatch[2]);
    const direct = body.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (direct) return parsePair(direct[1], direct[2]);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // Bare @lat,lng fragment pasted alone
    const bare = raw.match(
      /@(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
    );
    return bare ? parsePair(bare[1], bare[2]) : null;
  }

  const href = url.href;

  // Google data param: !3dLAT!4dLNG (precise place)
  const bang = href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (bang) return parsePair(bang[1], bang[2]);

  // Place protobuf often uses !2dLNG!3dLAT
  const bang23 = href.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
  if (bang23) return parsePair(bang23[2], bang23[1]);

  // /maps/dir//33.89,35.50/ destination (prefer over map @center)
  const pathPair = url.pathname.match(
    /\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:\/|$)/,
  );
  if (pathPair) return parsePair(pathPair[1], pathPair[2]);

  // Google: .../@33.89,35.50,17z
  const at = href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return parsePair(at[1], at[2]);

  const params = url.searchParams;
  for (const key of ["ll", "center", "coordinate", "sll"]) {
    const v = params.get(key);
    if (!v) continue;
    const m = v.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (m) return parsePair(m[1], m[2]);
  }

  for (const key of ["q", "query", "daddr", "saddr"]) {
    const v = params.get(key);
    if (!v) continue;
    const m = v.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (m) return parsePair(m[1], m[2]);
  }

  return null;
}

/**
 * Pull lat/lng out of a Google Maps HTML page when the URL only has a place name.
 * Prefers staticmap center=, then !3d!4d, then place !2d!3d.
 */
export function parseCoordsFromMapsHtml(html: string): LatLng | null {
  if (!html) return null;

  const center = html.match(
    /center=(-?\d+(?:\.\d+)?)(?:%2C|,)(-?\d+(?:\.\d+)?)/i,
  );
  if (center) {
    const c = parsePair(center[1], center[2]);
    if (c) return c;
  }

  const bang34 = html.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (bang34) {
    const c = parsePair(bang34[1], bang34[2]);
    if (c) return c;
  }

  const enc34 = html.match(/%213d(-?\d+(?:\.\d+)?)%214d(-?\d+(?:\.\d+)?)/i);
  if (enc34) {
    const c = parsePair(enc34[1], enc34[2]);
    if (c) return c;
  }

  // Place payload: !2dLNG!3dLAT (and URL-encoded form)
  const bang23 = html.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
  if (bang23) {
    const c = parsePair(bang23[2], bang23[1]);
    if (c) return c;
  }
  const enc23 = html.match(/%212d(-?\d+(?:\.\d+)?)%213d(-?\d+(?:\.\d+)?)/i);
  if (enc23) {
    const c = parsePair(enc23[2], enc23[1]);
    if (c) return c;
  }

  return null;
}

export function isShortMapsLink(urlStr: string): boolean {
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    return SHORT_LINK_HOSTS.has(host);
  } catch {
    return false;
  }
}

export type ExpandResult = {
  url: string;
  /** Response HTML when we fetched a short link (may contain coords for place-name URLs). */
  html: string | null;
};

/**
 * Follow redirects for goo.gl / maps.app.goo.gl so we can parse the final URL.
 * Client-first; may fail if the host blocks the request.
 */
export async function expandUrlIfNeeded(urlStr: string): Promise<ExpandResult> {
  if (!isShortMapsLink(urlStr)) return { url: urlStr, html: null };
  try {
    const res = await fetch(urlStr, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; SkounLocation/1.0; +https://skoun.app)",
      },
    });
    const body = await res.text();
    // #region agent log
    dbg("A", "parseLocationLink.ts:expandUrlIfNeeded", "short link fetch result", {
      input: urlStr.slice(0, 120),
      status: res.status,
      resUrl: (res.url ?? "").slice(0, 300),
      resUrlSameAsInput: res.url === urlStr,
      locationHeader: (res.headers.get("location") ?? "").slice(0, 300),
      contentType: res.headers.get("content-type"),
      bodyLen: body.length,
      bodyHasAt: /@-?\d/.test(body),
      bodyHas3d: /!3d-?\d/.test(body),
      bodyHasMaps: /google\.com\/maps/.test(body),
      bodyHasCenter: /center=-?\d/.test(body),
      metaRefresh:
        /url=(https[^"'\s>]+)/i.exec(body)?.[1]?.slice(0, 250) ?? null,
      bodyHead: body.slice(0, 280),
    });
    // #endregion
    let finalUrl = urlStr;
    if (res.url && res.url !== urlStr) {
      finalUrl = res.url;
    } else {
      const loc = res.headers.get("location");
      if (loc) {
        try {
          finalUrl = new URL(loc, urlStr).href;
        } catch {
          finalUrl = loc;
        }
      }
    }
    return { url: finalUrl, html: body };
  } catch (err) {
    // #region agent log
    dbg("D", "parseLocationLink.ts:expandUrlIfNeeded", "short link fetch THREW", {
      input: urlStr.slice(0, 120),
      error: String(err),
    });
    // #endregion
    throw new Error(
      "Couldn’t open that short link. Paste the full Google/Apple Maps URL instead.",
    );
  }
}

export type ResolveLocationLinkResult =
  | { ok: true; coord: LatLng; resolvedUrl: string }
  | { ok: false; message: string };

/**
 * Paste blob → expand short links → parse coords.
 */
export async function resolveLocationLink(
  paste: string,
): Promise<ResolveLocationLinkResult> {
  const extracted = extractUrlFromPaste(paste);
  // #region agent log
  dbg("E", "parseLocationLink.ts:resolveLocationLink", "extracted url from paste", {
    pasteLen: paste.trim().length,
    pasteHead: paste.trim().slice(0, 160),
    extracted: extracted?.slice(0, 160) ?? null,
    isShort: extracted ? isShortMapsLink(extracted) : null,
  });
  // #endregion
  if (!extracted) {
    return {
      ok: false,
      message: "Paste a Google Maps, Apple Maps, or geo: link.",
    };
  }

  let resolvedUrl = extracted;
  let html: string | null = null;
  try {
    const expanded = await expandUrlIfNeeded(extracted);
    resolvedUrl = expanded.url;
    html = expanded.html;
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "Couldn’t open that short link.",
    };
  }

  let coord = parseCoordsFromLocationUrl(resolvedUrl);
  let fromHtml = false;
  if (!coord && html) {
    coord = parseCoordsFromMapsHtml(html);
    fromHtml = Boolean(coord);
  }
  // #region agent log
  dbg("B", "parseLocationLink.ts:resolveLocationLink", "parse after expand", {
    extracted: extracted.slice(0, 160),
    resolvedUrl: resolvedUrl.slice(0, 400),
    expandedChanged: resolvedUrl !== extracted,
    stillShort: isShortMapsLink(resolvedUrl),
    hasAt: /@-?\d/.test(resolvedUrl),
    hasBang3d: /!3d-?\d/.test(resolvedUrl),
    hasQ: /[?&]q=/.test(resolvedUrl),
    fromHtml,
    coord,
    parseOk: Boolean(coord),
  });
  // #endregion
  if (!coord) {
    return {
      ok: false,
      message:
        "Couldn’t read coordinates from that link. Open it in Maps and share the place again, or drop a pin.",
    };
  }

  return { ok: true, coord, resolvedUrl };
}
