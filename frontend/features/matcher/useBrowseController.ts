import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useUniversities } from "@/features/universities/useUniversities";
import {
  EMPTY_BROWSE_FILTERS,
  type BrowseFiltersValue,
} from "@/lib/browseFiltersValue";
import {
  browseParamsKey,
  parseBrowseState,
  serializeBrowseState,
  type BrowseParams,
  type BrowseSort,
  type BrowseState,
} from "./browseState";
import {
  compilePreferences,
  campusLocation,
  hasAnswers,
  reconcilePreferences,
} from "./preferences";
import { saveMatcherPreferences } from "./storage";
import type { MatcherPreferences } from "./types";

/** One source of truth for both Explore renderers; matcher data never reaches API params. */
export function useBrowseController() {
  const params = useLocalSearchParams() as BrowseParams;
  const universities = useUniversities();
  // Static web HTML has no request query. Hydrate URL state after mounting so
  // its first client render agrees with the exported Explore shell.
  const [state, setState] = useState(() => parseBrowseState({}));
  const current = useRef(state);
  const paramsKey = browseParamsKey(params);
  const seen = useRef<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [applyRevision, setApplyRevision] = useState(0);
  useEffect(() => {
    if (paramsKey === seen.current) return;
    seen.current = paramsKey;
    const next = parseBrowseState(params);
    current.current = next;
    setState(next);
  }, [paramsKey]);
  useEffect(() => {
    if (params.guide === "1") {
      setOpen(true);
      router.setParams({ guide: "" });
    }
  }, [params.guide]);
  const commit = useCallback((next: BrowseState) => {
    current.current = next;
    setState(next);
    const serialized = serializeBrowseState(next);
    seen.current = browseParamsKey(serialized);
    // Clear the one-shot entry flag again at commit: the initial navigation may
    // still be hydrating when its mount effect runs on a statically rendered URL.
    router.setParams({ ...serialized, guide: "" } as never);
  }, []);
  useEffect(() => {
    const location = current.current.prefs?.location;
    if (location?.value.kind !== "campus" || location.value.center) return;
    const university = universities.data?.find(
      (u) => u.id === location.value.campusId || u.slug === location.value.slug,
    );
    if (university?.lat == null || university.lng == null) return;
    commit({
      ...current.current,
      prefs: {
        ...current.current.prefs!,
        location: {
          ...location,
          value: { ...location.value, ...campusLocation(university) },
        },
      },
    });
  }, [universities.data, state.prefs, commit]);
  const setFilters = useCallback(
    (action: SetStateAction<BrowseFiltersValue>) => {
      const prev = current.current;
      let filters =
        typeof action === "function" ? action(prev.filters) : action;
      const locationChanged =
        filters.campusId !== prev.filters.campusId ||
        filters.universitySlugs.join() !==
          prev.filters.universitySlugs.join() ||
        filters.areas.join() !== prev.filters.areas.join();
      if (locationChanged) filters = { ...filters, radiusKm: null };
      const prefs = reconcilePreferences(
        prev.prefs,
        prev.filters,
        filters,
        universities.data ?? [],
      );
      commit({
        ...prev,
        filters,
        prefs,
        sort: prev.sort === "match" && !prefs ? "newest" : prev.sort,
        mode:
          filters.campusId || filters.universitySlugs.length
            ? "university"
            : "standard",
      });
    },
    [commit, universities.data],
  );
  const setMode = useCallback(
    (mode: BrowseState["mode"]) => {
      commit({ ...current.current, mode });
    },
    [commit],
  );
  const setSort = useCallback(
    (sort: BrowseSort) => {
      commit({
        ...current.current,
        sort: sort === "match" && !current.current.prefs ? "newest" : sort,
      });
    },
    [commit],
  );
  const apply = useCallback(
    (prefs: MatcherPreferences) => {
      const filters = compilePreferences(current.current.filters, prefs);
      const active = hasAnswers(prefs);
      commit({
        filters,
        prefs: active ? prefs : null,
        sort: active ? "match" : "newest",
        mode:
          filters.campusId || filters.universitySlugs.length
            ? "university"
            : "standard",
      });
      void saveMatcherPreferences(prefs, "applied");
      setOpen(false);
      setApplyRevision((n) => n + 1);
    },
    [commit],
  );
  const clear = useCallback(
    () =>
      commit({
        filters: { ...EMPTY_BROWSE_FILTERS },
        mode: "standard",
        sort: "newest",
        prefs: null,
      }),
    [commit],
  );
  const stop = useCallback(
    () => commit({ ...current.current, prefs: null, sort: "newest" }),
    [commit],
  );
  const deferred = useDeferredValue(state);
  return {
    ...state,
    deferred,
    params,
    setFilters,
    setMode,
    setSort,
    apply,
    clear,
    stop,
    open,
    setOpen,
    applyRevision,
  };
}
