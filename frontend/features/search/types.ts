export type SearchLabel = { en: string; ar: string };
export type SearchCenter = { lat: number; lng: number } | null;
type SuggestionBase = { id: string; label: SearchLabel; context: SearchLabel; url: string; center: SearchCenter; eligibleUnitCount?: number; thumbnailUrl?: string | null; thumbnailSource?: 'curated' | 'listing' | null };
export type CitySuggestion = SuggestionBase & { type: 'city'; slug: string; canonicalAreas: string[] };
export type AreaSuggestion = SuggestionBase & { type: 'area'; slug: string; canonicalArea: string };
export type CampusSuggestion = SuggestionBase & { type: 'campus'; slug: string; nearbyRadiusMeters?: number };
export type PlaceSuggestion = SuggestionBase & { type: 'place'; canonicalArea: string };
export type SearchSuggestion = CitySuggestion | AreaSuggestion | CampusSuggestion | PlaceSuggestion;
export type SearchSuggestResult = {
  query: string;
  normalizedQuery: string;
  mode: 'defaults' | 'results';
  minQueryLength: 2;
  results: SearchSuggestion[];
  sections: { topAreas: (CitySuggestion | AreaSuggestion)[]; topCampuses: CampusSuggestion[] };
};
