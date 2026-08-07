/**
 * Zoom-based map clustering (Amber-style) via Supercluster.
 * Operates on MapPinGroups (after coincident 10m collapse), not raw listings.
 */
import Supercluster from "supercluster";
import type { MapPinGroup } from "@/lib/mapPinGroups";

/** Cluster radius in screen pixels — denser = more aggressive merge. */
export const CLUSTER_RADIUS_PX = 52;
/** Above this zoom, Supercluster returns only leaves (price tags). */
export const CLUSTER_MAX_ZOOM = 16;

export type PinClusterProps = {
  groupId: string;
  price: number;
  /** Coincident listings already folded into this pin group. */
  memberCount: number;
};

export type MapBBox = [west: number, south: number, east: number, north: number];

export type VisibleMapFeature =
  | {
      kind: "cluster";
      clusterId: number;
      lat: number;
      lng: number;
      pointCount: number;
      expansionZoom: number;
    }
  | {
      kind: "leaf";
      groupId: string;
      lat: number;
      lng: number;
    };

export type PinClusterIndex = Supercluster<PinClusterProps>;

export function buildPinClusterIndex(groups: MapPinGroup[]): PinClusterIndex {
  const index = new Supercluster<PinClusterProps>({
    radius: CLUSTER_RADIUS_PX,
    maxZoom: CLUSTER_MAX_ZOOM,
    minPoints: 2,
  });

  index.load(
    groups.map((group) => ({
      type: "Feature" as const,
      properties: {
        groupId: group.id,
        price: group.displayPriceUsd,
        memberCount: group.count,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [group.lng, group.lat] as [number, number],
      },
    })),
  );

  return index;
}

export function queryVisibleFeatures(
  index: PinClusterIndex,
  bbox: MapBBox,
  zoom: number,
): VisibleMapFeature[] {
  const z = Math.max(0, Math.min(CLUSTER_MAX_ZOOM + 1, Math.floor(zoom)));
  const features = index.getClusters(bbox, z);

  return features.map((feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;

    if ("cluster" in props && props.cluster) {
      const clusterId = props.cluster_id as number;
      return {
        kind: "cluster" as const,
        clusterId,
        lat,
        lng,
        pointCount: props.point_count as number,
        expansionZoom: index.getClusterExpansionZoom(clusterId),
      };
    }

    return {
      kind: "leaf" as const,
      groupId: (props as PinClusterProps).groupId,
      lat,
      lng,
    };
  });
}

/** Pad viewport so edge pins don't pop in/out while panning. */
export function padBBox(bbox: MapBBox, padFraction = 0.12): MapBBox {
  const [west, south, east, north] = bbox;
  const lngPad = (east - west) * padFraction;
  const latPad = (north - south) * padFraction;
  return [west - lngPad, south - latPad, east + lngPad, north + latPad];
}

/**
 * Approximate Web Mercator zoom from a react-native-maps region.
 * `viewportWidthPx` improves accuracy; 360 is a sane default for phones.
 */
export function zoomFromLongitudeDelta(
  longitudeDelta: number,
  viewportWidthPx = 360,
): number {
  if (longitudeDelta <= 0) return CLUSTER_MAX_ZOOM;
  return Math.log2((360 * viewportWidthPx) / (longitudeDelta * 256));
}

export function regionToBBox(region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}): MapBBox {
  const west = region.longitude - region.longitudeDelta / 2;
  const east = region.longitude + region.longitudeDelta / 2;
  const south = region.latitude - region.latitudeDelta / 2;
  const north = region.latitude + region.latitudeDelta / 2;
  return [west, south, east, north];
}

/** Diameter (px) for Amber-style count bubbles by density. */
export function clusterBubbleSize(pointCount: number): number {
  if (pointCount >= 20) return 52;
  if (pointCount >= 10) return 46;
  if (pointCount >= 5) return 40;
  return 34;
}

/**
 * Build a region centered on a cluster at its expansion zoom.
 * Used by native maps (animateToRegion) when zoom camera API differs by OS.
 */
export function regionForExpansion(
  lat: number,
  lng: number,
  expansionZoom: number,
  viewportWidthPx = 360,
  aspect = 1,
): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  const zoom = Math.min(expansionZoom + 0.35, 18);
  const longitudeDelta = (360 * viewportWidthPx) / (Math.pow(2, zoom) * 256);
  return {
    latitude: lat,
    longitude: lng,
    longitudeDelta,
    latitudeDelta: longitudeDelta * Math.max(aspect, 0.5),
  };
}
