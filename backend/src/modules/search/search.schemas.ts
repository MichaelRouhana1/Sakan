import { z } from 'zod';

export const searchSuggestQuerySchema = z.object({
  q: z.string().trim().refine(value => [...value].length <= 64, 'q must be at most 64 characters').default(''),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
export type SearchSuggestQuery = z.infer<typeof searchSuggestQuerySchema>;
export type SearchLabel = { en: string; ar: string };
export type SearchCenter = { lat: number; lng: number } | null;
type SuggestionBase = { id: string; label: SearchLabel; context: SearchLabel; url: string; center: SearchCenter; eligibleUnitCount?: number; thumbnailUrl?: string | null; thumbnailSource?: 'curated' | 'listing' | null };
export type CitySuggestion = SuggestionBase & { type: 'city'; slug: string; canonicalAreas: string[] };
export type AreaSuggestion = SuggestionBase & { type: 'area'; slug: string; canonicalArea: string };
export type CampusSuggestion = SuggestionBase & { type: 'campus'; slug: string; nearbyRadiusMeters?: number };
export type PlaceSuggestion = SuggestionBase & { type: 'place'; canonicalArea: string };
/** Street or OSM neighbourhood: "N places near X", or the parent area's count when nothing is within the radius. */
export type NearbySuggestion = SuggestionBase & {
  type: 'street' | 'hood'; slug: string; canonicalArea: string; parentAreaId: string; nearbyRadiusMeters: number;
  fallback: { canonicalArea: string; label: SearchLabel; count: number } | null;
};
export type SearchSuggestion = CitySuggestion | AreaSuggestion | CampusSuggestion | PlaceSuggestion | NearbySuggestion;
export type SearchSuggestResult = {
  query: string;
  normalizedQuery: string;
  mode: 'defaults' | 'results';
  minQueryLength: 2;
  results: SearchSuggestion[];
  sections: { topAreas: (CitySuggestion | AreaSuggestion)[]; topCampuses: CampusSuggestion[] };
};

export const searchRecentSchema = z.discriminatedUnion('type',[
  z.object({type:z.literal('city'),id:z.string().max(128).regex(/^city:[a-z0-9]+(?:-[a-z0-9]+)*$/)}).strict(),
  z.object({type:z.literal('area'),id:z.string().max(128).regex(/^area:[a-z0-9]+(?:-[a-z0-9]+)*$/)}).strict(),
  z.object({type:z.literal('campus'),id:z.uuid()}).strict(),
  z.object({type:z.literal('place'),id:z.uuid()}).strict(),
  z.object({type:z.literal('street'),id:z.string().max(128).regex(/^street:[a-z0-9]+(?:-[a-z0-9]+)*$/)}).strict(),
  z.object({type:z.literal('hood'),id:z.string().max(128).regex(/^hood:[a-z0-9]+(?:-[a-z0-9]+)*$/)}).strict(),
]);
export type SearchRecentInput = z.infer<typeof searchRecentSchema>;
