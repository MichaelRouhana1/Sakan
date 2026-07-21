/** Soft-launch dense corridor — editable. */
export const ROOMMATE_LAUNCH_AREAS = [
  "Hamra",
  "Ras Beirut",
  "Achrafieh",
  "Mar Mikhael",
  "Gemmayzeh",
  "Verdun",
  "Dbayeh",
  "Antelias",
] as const;

export type RoommateLaunchArea = (typeof ROOMMATE_LAUNCH_AREAS)[number];

export const ROOMMATE_LAUNCH_AREA_SET = new Set<string>(ROOMMATE_LAUNCH_AREAS);

export const ROOMMATE_INVITE_NOTE_MIN = 20;
export const ROOMMATE_INVITES_PER_DAY = 10;
export const ROOMMATE_CARD_CREATES_PER_DAY = 3;
export const FREE_SLOT_REPLACEMENTS_PER_MONTH = 2;
