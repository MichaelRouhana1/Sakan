/**
 * Distance labels for University Hub.
 * Prefer named campus when known; otherwise “from campus”.
 */
export function formatDistanceMeters(
  meters?: number | null,
  campusName?: string | null,
): string | null {
  if (meters == null || Number.isNaN(meters)) return null;
  const dist =
    meters < 1000
      ? `${Math.round(meters)} m`
      : `${(meters / 1000).toFixed(1)} km`;
  if (campusName) return `${dist} from ${campusName}`;
  return `${dist} from campus`;
}

/** Compact map badge label (no campus name). */
export function formatDistanceShort(meters?: number | null): string | null {
  if (meters == null || Number.isNaN(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
