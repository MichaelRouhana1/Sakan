import { z } from "zod";

export const searchSuggestionsQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "q is required")
    .max(64, "q must be at most 64 characters"),
});

export type SearchSuggestionsQuery = z.infer<typeof searchSuggestionsQuerySchema>;

export type AreaSuggestion = {
  type: "area";
  label: string;
  boundingBox: null;
  center: { lat: number; lng: number };
};

export type UniversitySuggestion = {
  type: "university";
  label: string;
  campusId: string;
  slug: string;
  center: { lat: number; lng: number };
};

export type ListingSuggestion = {
  type: "listing";
  id: string;
  label: string;
  center: { lat: number; lng: number } | null;
};

export type SearchSuggestionsResult = {
  areas: AreaSuggestion[];
  universities: UniversitySuggestion[];
  listings: ListingSuggestion[];
};
