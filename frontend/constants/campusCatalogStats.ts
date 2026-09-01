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

/** Seeded academic catalog — must match `db:seed:academic`. */
export const ACADEMIC_CATALOG = {
  faculties: 191,
  programs: 616,
  /** Universities with a full 2026–2027 per-credit rate on every faculty. */
  tuitionYear: "2026-2027",
} as const;
