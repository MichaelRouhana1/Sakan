export type SearchAreaSuggestion = {
  type: "area";
  label: string;
  boundingBox: null;
  center: { lat: number; lng: number };
};

export type SearchUniversitySuggestion = {
  type: "university";
  label: string;
  campusId: string;
  slug: string;
  center: { lat: number; lng: number };
};

export type SearchListingSuggestion = {
  type: "listing";
  id: string;
  label: string;
  center: { lat: number; lng: number } | null;
};

export type SearchSuggestionsData = {
  areas: SearchAreaSuggestion[];
  universities: SearchUniversitySuggestion[];
  listings: SearchListingSuggestion[];
};

export type SearchSuggestion =
  | SearchAreaSuggestion
  | SearchUniversitySuggestion
  | SearchListingSuggestion;
