/**
 * Private MEHE catalog — must match `campusCatalogStats` in
 * `backend/src/db/seeds/universities.ts`.
 * Areas = unique campus cities (spelling variants folded).
 */
export const CAMPUS_CATALOG = {
  universities: 36,
  campuses: 101,
  areas: 52,
} as const;
