/** Soft-launch dense corridor — keep in sync with backend/src/constants/roommate.ts */
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

export const END_MATCH_COPY =
  "Contact is hidden in Skoun. If you already saved the number in WhatsApp, that chat is unchanged.";
