/** Map pin text. Lists keep the full campus `name`. */
export function campusPinLabel(campus: {
  mapLabel?: string | null;
  name: string;
}): string {
  const compact = campus.mapLabel?.trim();
  return compact || campus.name;
}

/** Confirm copy on an unselected campus pin before making it the hub. */
export const CAMPUS_SWITCH_PROMPT = "Switch to this campus?";
