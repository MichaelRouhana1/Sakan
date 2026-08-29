import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SearchSuggestionsData } from "./types";

const DEBOUNCE_MS = 280;

export const searchKeys = {
  all: ["search"] as const,
  suggestions: (q: string) => [...searchKeys.all, "suggestions", q] as const,
};

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useSearchSuggestions(query: string, enabled = true) {
  const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const ready = enabled && debounced.length >= 1;

  return useQuery({
    queryKey: searchKeys.suggestions(debounced),
    enabled: ready,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchSuggestionsData> => {
      const { data } = await api.get<{ data: SearchSuggestionsData }>(
        "/api/search/suggestions",
        { params: { q: debounced } },
      );
      return data.data;
    },
  });
}
