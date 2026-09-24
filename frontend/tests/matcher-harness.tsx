import React, { useMemo, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Pressable, Text, View } from "react-native";
import axios from "axios";
import { useBrowseController } from "@/features/matcher/useBrowseController";
import {
  MatcherSheet,
  FindMyPlaceEntry,
} from "@/components/matcher/MatcherSheet";
import { MatchSummaryBar } from "@/components/matcher/MatchResults";
import { ListingResultCard } from "@/components/web/ListingResultCard";
import { useListings } from "@/features/listings/useListings";
import { toListFilters } from "@/lib/browseFilters";
import { rankListings, explainWidening } from "@/features/matcher/scoring";

export const api = axios.create();
export const API_BASE_URL = window.location.origin;
const subscribe = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
export function useLocalSearchParams() {
  const search = useSyncExternalStore(subscribe, () => window.location.search);
  return useMemo(
    () => Object.fromEntries(new URLSearchParams(search)),
    [search],
  );
}
export const router = {
  setParams(params: Record<string, string | undefined>) {
    const u = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) =>
      value == null
        ? u.searchParams.delete(key)
        : u.searchParams.set(key, value),
    );
    window.history.replaceState({}, "", u);
    window.dispatchEvent(new PopStateEvent("popstate"));
  },
  push(path: string) {
    (window as any).openedListing = path;
  },
};
export const useRouter = () => router;
export const useIsSaved = () => ({ data: false });
export const useToggleSaved = () => ({
  mutate: (listing: unknown) => {
    (window as any).savedListing = listing;
  },
});
function App() {
  const c = useBrowseController();
  const { filters, sort, prefs } = c.deferred;
  const query = useListings(
    toListFilters(
      c.deferred.mode,
      filters,
      sort === "rent_asc" ? "price_asc" : "newest",
    ),
  );
  const ranked = rankListings(
    query.data?.listings ?? [],
    prefs ?? { version: 1 },
  );
  const matching = sort === "match" && !!prefs;
  return (
    <View
      style={{
        maxWidth: 1100,
        marginHorizontal: "auto",
        padding: 20,
        width: "100%",
      }}
    >
      <FindMyPlaceEntry onPress={() => c.setOpen(true)} />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 12,
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => c.setFilters((f) => ({ ...f, maxRentUsd: 400 }))}
        >
          <Text>Set manual budget 400</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => c.setFilters((f) => ({ ...f, maxRentUsd: null }))}
        >
          <Text>Remove manual budget</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => c.setSort("newest")}
        >
          <Text>Sort newest</Text>
        </Pressable>
      </View>
      <MatcherSheet
        visible={c.open}
        filters={c.filters}
        applied={c.prefs}
        firstName={new URLSearchParams(window.location.search).get("name")}
        onClose={() => c.setOpen(false)}
        onApply={c.apply}
      />
      {prefs ? (
        <MatchSummaryBar
          prefs={prefs}
          count={ranked.listings.length}
          widening={explainWidening(ranked.listings, prefs)}
          matching={matching}
          loading={query.isLoading || query.isError}
          onEdit={() => c.setOpen(true)}
          onStop={c.stop}
          onClear={c.clear}
          onMatch={() => c.setSort("match")}
          focusRevision={c.applyRevision}
        />
      ) : null}
      {query.isLoading ? (
        <Text>Loading inventory</Text>
      ) : query.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
        >
          <Text>Retry inventory</Text>
        </Pressable>
      ) : (
        <View style={{ gap: 20 }}>
          {ranked.listings.map((l) => (
            <View
              testID={`result-${l.id}`}
              key={l.id}
              style={{ maxWidth: 440 }}
            >
              <ListingResultCard
                listing={l}
                match={matching ? ranked.matches[l.id] : undefined}
              />
            </View>
          ))}
        </View>
      )}
      <output data-testid="state" style={{ display: "none" }}>
        {JSON.stringify({ filters: c.filters, prefs: c.prefs, sort: c.sort })}
      </output>
    </View>
  );
}
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0, refetchOnWindowFocus: false },
  },
});
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 1440, height: 900 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <App />
    </SafeAreaProvider>
  </QueryClientProvider>,
);
