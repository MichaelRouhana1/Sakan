import { z } from 'zod';

export const searchSuggestQuerySchema = z.object({
  q: z.string().trim().refine(value => [...value].length <= 64, 'q must be at most 64 characters').default(''),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
export type SearchSuggestQuery = z.infer<typeof searchSuggestQuerySchema>;
export type SearchLabel = { en: string; ar: string };
export type SearchCenter = { lat: number; lng: number } | null;
type SuggestionBase = { id: string; label: SearchLabel; context: SearchLabel; url: string; center: SearchCenter };
export type CitySuggestion = SuggestionBase & { type: 'city'; slug: string; canonicalAreas: string[] };
export type AreaSuggestion = SuggestionBase & { type: 'area'; slug: string; canonicalArea: string };
export type CampusSuggestion = SuggestionBase & { type: 'campus'; slug: string };
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
