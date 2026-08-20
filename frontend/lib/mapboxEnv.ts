const DEFAULT_STYLE = "mapbox://styles/mapbox/light-v11";

export function getMapboxToken(): string | null {
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
  return token.length > 0 ? token : null;
}

export function hasMapboxToken(): boolean {
  return getMapboxToken() != null;
}

export function getMapboxStyle(): string {
  const style = process.env.EXPO_PUBLIC_MAPBOX_STYLE?.trim() ?? "";
  return style.length > 0 ? style : DEFAULT_STYLE;
}

/** Parse `mapbox://styles/{owner}/{id}` (and fallbacks) for Static Images API. */
export function parseMapboxStyleRef(style = getMapboxStyle()): {
  owner: string;
  styleId: string;
} {
  const match = style.match(/^mapbox:\/\/styles\/([^/]+)\/([^/?#]+)/);
  if (match?.[1] && match[2]) {
    return { owner: match[1], styleId: match[2] };
  }
  return { owner: "mapbox", styleId: "light-v11" };
}

export const MAP_TOKEN_MISSING_COPY =
  "Map token missing (EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN)";

export function mapboxStaticImageUrl(opts: {
  lng: number;
  lat: number;
  zoom: number;
  width: number;
  height: number;
}): string | null {
  const token = getMapboxToken();
  if (!token) return null;
  const { owner, styleId } = parseMapboxStyleRef();
  const w = Math.max(1, Math.min(1280, Math.round(opts.width)));
  const h = Math.max(1, Math.min(1280, Math.round(opts.height)));
  return `https://api.mapbox.com/styles/v1/${owner}/${styleId}/static/${opts.lng},${opts.lat},${opts.zoom},0/${w}x${h}@2x?access_token=${encodeURIComponent(token)}`;
}
