import { useMemo, useRef } from "react";
import type { CampusMeta, Listing } from "@/types/listing";

type MapRecords<T> = { key: string; records: T[] };

/** Normalized API records are JSON data. Object key order is not a data change. */
function recordsKey<T>(records: readonly T[]): string {
  const serialized = records.map((record) => JSON.stringify(record, (_key, value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]));
  }));
  // Sort the signatures, not the records: retain initial server order on the map.
  // Nested arrays (e.g. photo order) and duplicate-record counts remain meaningful.
  return JSON.stringify(serialized.sort());
}

export function reconcileWebMapRecords<T>(
  previous: MapRecords<T> | null,
  incoming: readonly T[],
): MapRecords<T> {
  const key = recordsKey(incoming);
  return previous?.key === key ? previous : { key, records: [...incoming] };
}

/** Selection/initial-fit membership only; metadata and response order are separate. */
export function webMapIdentityKey(ids: readonly string[]): string {
  return JSON.stringify([...new Set(ids)].sort());
}

function useStableRecords<T>(incoming: readonly T[], normalize?: (record: T) => T): T[] {
  const previous = useRef<MapRecords<T> | null>(null);
  const lastInput = useRef<readonly T[] | null>(null);
  return useMemo(() => {
    // Query records are immutable. A fresh concatenation of the same objects
    // needs only a shallow check, not another serialization of every listing.
    const priorInput = lastInput.current;
    if (previous.current && priorInput && incoming.length === priorInput.length &&
      incoming.every((record, index) => record === priorInput[index])) {
      return previous.current.records;
    }
    const normalized = normalize ? incoming.map(normalize) : incoming;
    const next = reconcileWebMapRecords(previous.current, normalized);
    previous.current = next;
    lastInput.current = [...incoming];
    return next.records;
  }, [incoming, normalize]);
}

const withoutPromotion = (listing: Listing): Listing => listing.promotion === undefined
  ? listing
  : { ...listing, promotion: undefined };

/** Map-only: keep list ranking/order and all shared/native query behavior intact. */
export function useStableWebMapListings(incoming: readonly Listing[]): Listing[] {
  return useStableRecords(incoming, withoutPromotion);
}

export function useStableWebMapCampuses(incoming: readonly CampusMeta[]): CampusMeta[] {
  return useStableRecords(incoming);
}
