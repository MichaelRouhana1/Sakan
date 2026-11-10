import type { FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, LayerSpecification, Map as MapboxMap } from "mapbox-gl";
import { CLUSTER_MAX_ZOOM, CLUSTER_RADIUS_PX } from "@/lib/mapClusters";
import type { MapPinGroup } from "@/lib/mapPinGroups";
import {
  CLUSTER_IMAGE_PREFIX, PIN_IMAGE_PREFIX, PIN_IMAGE_RATIO,
  makeClusterCountImage, makePricePinImage, priceImageId,
} from "@/lib/webMapPinImages.web";

export const WEB_PIN_SOURCE = "studently-listing-points";
export const WEB_PIN_LAYER = "studently-listing-pins";
export const WEB_CLUSTER_SHADOW = "studently-listing-cluster-shadow";
export const WEB_CLUSTER_LAYER = "studently-listing-clusters";
export const WEB_CLUSTER_COUNT = "studently-listing-cluster-count";
export const WEB_ACTIVE_SOURCE = "studently-active-listing-points";
export const WEB_ACTIVE_LAYER = "studently-active-listing-pin";
export const WEB_PIN_LAYERS = [WEB_PIN_LAYER, WEB_CLUSTER_SHADOW, WEB_CLUSTER_LAYER, WEB_CLUSTER_COUNT, WEB_ACTIVE_LAYER] as const;

type PinProperties = { groupId: string; price: number; memberCount: number; label: string; image: string; activeImage: string };
export type PinLayerData = FeatureCollection<Point, PinProperties>;
export type LayerHit = { kind: "pin"; groupId: string } | { kind: "cluster"; clusterId: number; coordinates: [number, number] };

export function groupsToLayerData(groups: readonly MapPinGroup[], alwaysShowCount = false): PinLayerData {
  return {
    type: "FeatureCollection",
    features: [...groups].sort((a, b) => a.id.localeCompare(b.id)).map((group) => {
      const price = `$${group.displayPriceUsd.toLocaleString("en-US")}`;
      const label = group.count > 1 || alwaysShowCount ? `${price} · ${group.count}` : price;
      return {
        type: "Feature", id: group.id,
        geometry: { type: "Point", coordinates: [group.lng, group.lat] },
        properties: { groupId: group.id, price: group.displayPriceUsd, memberCount: group.count, label, image: priceImageId(label), activeImage: priceImageId(label, true) },
      };
    }),
  };
}

/** Clustered ordinary pins and an unclustered highlight share stable place IDs. */
export class WebMapLayerRenderer {
  private data: PinLayerData = { type: "FeatureCollection", features: [] };
  private dataKey = "";
  private active: string | null = null;
  private fontsReady = false;
  private disposed = false;
  private priceImages = new Set<string>();

  constructor(private map: MapboxMap, private options: { cluster?: boolean; alwaysShowCount?: boolean } = {}) {
    map.on("style.load", this.install);
    map.on("load", this.install);
    map.on("styleimagemissing", this.onMissingImage);
    map.on("idle", this.onIdle);
    void Promise.all([
      document.fonts?.load('600 12px "DM Sans"'),
      document.fonts?.load('700 15px "DM Sans"'),
    ]).catch(() => undefined).then(() => {
      if (this.disposed) return;
      this.fontsReady = true;
      if (map.isStyleLoaded()) this.install();
    });
  }

  updateGroups(groups: readonly MapPinGroup[]): void {
    const data = groupsToLayerData(groups, this.options.alwaysShowCount);
    const key = JSON.stringify(data);
    if (key === this.dataKey) return;
    this.data = data;
    this.dataKey = key;
    this.priceImages = new Set(data.features.flatMap((feature) => [feature.properties.image, feature.properties.activeImage]));
    if (!this.fontsReady || this.disposed) return;
    const source = this.map.getSource(WEB_PIN_SOURCE) as GeoJSONSource | undefined;
    if (!source) return;
    this.addPriceImages();
    source.setData(data);
    (this.map.getSource(WEB_ACTIVE_SOURCE) as GeoJSONSource | undefined)?.setData(data);
    this.restoreActive();
  }

  setActiveGroup(groupId: string | null): void {
    if (groupId === this.active) return;
    for (const source of [WEB_PIN_SOURCE, WEB_ACTIVE_SOURCE]) {
      if (this.map.getSource(source) && this.active) this.map.removeFeatureState({ source, id: this.active }, "active");
    }
    this.active = groupId;
    this.restoreActive();
  }

  pick(point: { x: number; y: number }, padding = 0): LayerHit | null {
    if (this.disposed || !this.map.getLayer(WEB_PIN_LAYER)) return null;
    const box: [[number, number], [number, number]] = [[point.x - padding, point.y - padding], [point.x + padding, point.y + padding]];
    const layers = [WEB_ACTIVE_LAYER, WEB_PIN_LAYER, WEB_CLUSTER_LAYER].filter((id) => this.map.getLayer(id));
    const features = this.map.queryRenderedFeatures(box, { layers });
    const active = features.find((feature) => feature.layer?.id === WEB_ACTIVE_LAYER && feature.properties?.groupId === this.active);
    if (active) return { kind: "pin", groupId: String(active.properties?.groupId) };
    // queryRenderedFeatures also returns opacity-zero icons.
    const pin = features.find((feature) => feature.layer?.id === WEB_PIN_LAYER && feature.properties?.groupId !== this.active);
    if (pin) return { kind: "pin", groupId: String(pin.properties?.groupId) };
    const cluster = features.find((feature) => feature.layer?.id === WEB_CLUSTER_LAYER);
    if (cluster?.geometry.type === "Point") return {
      kind: "cluster", clusterId: Number(cluster.properties?.cluster_id),
      coordinates: cluster.geometry.coordinates as [number, number],
    };
    return null;
  }

  expandCluster(hit: Extract<LayerHit, { kind: "cluster" }>, reducedMotion: boolean, onExpand?: (center: [number, number], zoom: number) => void): void {
    const source = this.map.getSource(WEB_PIN_SOURCE) as GeoJSONSource | undefined;
    const dataKey = this.dataKey;
    source?.getClusterExpansionZoom(hit.clusterId, (error, zoom) => {
      if (error || zoom == null || this.disposed || dataKey !== this.dataKey || source !== this.map.getSource(WEB_PIN_SOURCE)) return;
      if (onExpand) { onExpand(hit.coordinates, zoom); return; }
      this.map.easeTo({ center: hit.coordinates, zoom, duration: reducedMotion ? 0 : 450 });
    });
  }

  private restoreActive(): void {
    for (const source of [WEB_PIN_SOURCE, WEB_ACTIVE_SOURCE]) {
      if (this.active && this.map.getSource(source)) this.map.setFeatureState({ source, id: this.active }, { active: true });
    }
  }

  private addPriceImages(): void {
    for (const feature of this.data.features) {
      const { image, activeImage, label } = feature.properties;
      if (!this.map.hasImage(image)) this.map.addImage(image, makePricePinImage(label), { pixelRatio: PIN_IMAGE_RATIO });
      if (this.options.cluster !== false && !this.map.hasImage(activeImage)) this.map.addImage(activeImage, makePricePinImage(label, true), { pixelRatio: PIN_IMAGE_RATIO });
    }
  }

  private onMissingImage = (event: { id: string }): void => {
    if (this.disposed || !this.fontsReady || this.map.hasImage(event.id)) return;
    if (event.id.startsWith(PIN_IMAGE_PREFIX) && this.priceImages.has(event.id)) {
      const feature = this.data.features.find((item) => item.properties.image === event.id || item.properties.activeImage === event.id);
      if (feature) this.map.addImage(event.id, makePricePinImage(feature.properties.label, feature.properties.activeImage === event.id), { pixelRatio: PIN_IMAGE_RATIO });
      return;
    }
    if (!event.id.startsWith(CLUSTER_IMAGE_PREFIX)) return;
    const count = Number(event.id.slice(CLUSTER_IMAGE_PREFIX.length));
    if (!Number.isSafeInteger(count) || count < 2 || this.map.hasImage(event.id)) return;
    this.map.addImage(event.id, makeClusterCountImage(count), { pixelRatio: PIN_IMAGE_RATIO });
  };

  private install = (): void => {
    if (this.disposed || !this.fontsReady) return;
    this.addPriceImages();
    if (!this.map.getSource(WEB_PIN_SOURCE)) this.map.addSource(WEB_PIN_SOURCE, {
      type: "geojson", data: this.data, promoteId: "groupId",
      cluster: this.options.cluster !== false, clusterRadius: CLUSTER_RADIUS_PX,
      clusterMaxZoom: CLUSTER_MAX_ZOOM, clusterMinPoints: 2,
    });
    // Mirror only on real data edits. Selection/hover change feature state on
    // both sources, never their data, so a highlight survives any cluster zoom.
    if (this.options.cluster !== false && !this.map.getSource(WEB_ACTIVE_SOURCE)) this.map.addSource(WEB_ACTIVE_SOURCE, {
      type: "geojson", data: this.data, promoteId: "groupId", cluster: false,
    });
    const specs: LayerSpecification[] = [
      {
        id: WEB_PIN_LAYER, type: "symbol", slot: "top", source: WEB_PIN_SOURCE, filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["get", "image"], "icon-anchor": "bottom", "icon-offset": [0, 4],
          "icon-allow-overlap": true, "icon-ignore-placement": true,
          "icon-pitch-alignment": "viewport", "icon-rotation-alignment": "viewport",
        },
        paint: { "icon-opacity": ["case", ["boolean", ["feature-state", "active"], false], 0, 1], "icon-opacity-transition": { duration: 0 }, "icon-occlusion-opacity": 1 },
      },
      {
        id: WEB_CLUSTER_SHADOW, type: "circle", slot: "top", source: WEB_PIN_SOURCE, filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["step", ["get", "point_count"], 21, 5, 24, 10, 27, 20, 30],
          "circle-color": "#121826", "circle-opacity": 0.2, "circle-blur": 0.5, "circle-translate": [0, 2],
          "circle-pitch-alignment": "viewport", "circle-pitch-scale": "viewport",
        },
      },
      {
        id: WEB_CLUSTER_LAYER, type: "circle", slot: "top", source: WEB_PIN_SOURCE, filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["step", ["get", "point_count"], 17, 5, 20, 10, 23, 20, 26],
          "circle-color": "#C23B2E", "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2.5,
          "circle-pitch-alignment": "viewport", "circle-pitch-scale": "viewport",
        },
      },
      {
        id: WEB_CLUSTER_COUNT, type: "symbol", slot: "top", source: WEB_PIN_SOURCE, filter: ["has", "point_count"],
        layout: {
          "icon-image": ["concat", CLUSTER_IMAGE_PREFIX, ["to-string", ["get", "point_count"]]],
          "icon-allow-overlap": true, "icon-ignore-placement": true,
          "icon-pitch-alignment": "viewport", "icon-rotation-alignment": "viewport",
        },
        // Mapbox 3.28.1 can pass an empty layer list to a stateless symbol
        // bucket when this source has selection state and zoom updates its UBO.
        // Match the leaf's state dependency so the count bucket gets its layer.
        // Generated numeric cluster IDs never equal our string place IDs.
        paint: { "icon-opacity": ["case", ["boolean", ["feature-state", "active"], false], 0, 1], "icon-opacity-transition": { duration: 0 }, "icon-occlusion-opacity": 1 },
      },
      {
        id: WEB_ACTIVE_LAYER, type: "symbol", slot: "top", source: WEB_ACTIVE_SOURCE,
        layout: {
          "icon-image": ["get", "activeImage"], "icon-anchor": "bottom", "icon-offset": [0, 4], "icon-size": 1.06,
          "icon-allow-overlap": true, "icon-ignore-placement": true,
          "icon-pitch-alignment": "viewport", "icon-rotation-alignment": "viewport",
        },
        paint: { "icon-opacity": ["case", ["boolean", ["feature-state", "active"], false], 1, 0], "icon-opacity-transition": { duration: 0 }, "icon-occlusion-opacity": 1 },
      },
    ];
    for (const spec of specs) {
      if (this.options.cluster === false && spec.id !== WEB_PIN_LAYER) continue;
      if (!this.map.getLayer(spec.id)) this.map.addLayer(spec);
    }
    this.keepRouteBelowPins();
    this.restoreActive();
  };

  private keepRouteBelowPins(): void {
    // Standard can defer the existing route's insertion until a later idle.
    const layers = this.map.getStyle().layers ?? [];
    const route = layers.findIndex((layer) => layer.id === "studently-campus-line-layer");
    const pins = layers.findIndex((layer) => layer.id === WEB_PIN_LAYER);
    if (route >= 0 && pins >= 0 && route > pins) this.map.moveLayer("studently-campus-line-layer", WEB_PIN_LAYER);
  }

  private onIdle = (): void => {
    if (this.disposed || !this.fontsReady) return;
    if (!this.map.getSource(WEB_PIN_SOURCE)) { this.install(); return; }
    this.keepRouteBelowPins();
    // Wait for source workers to finish before retiring old price sprites.
    for (const id of this.map.listImages()) {
      if (id.startsWith(PIN_IMAGE_PREFIX) && !this.priceImages.has(id)) this.map.removeImage(id);
    }
  };

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.map.off("style.load", this.install);
    this.map.off("load", this.install);
    this.map.off("styleimagemissing", this.onMissingImage);
    this.map.off("idle", this.onIdle);
    if (!this.map.isStyleLoaded()) return; // The owning map is being destroyed too.
    for (const id of [...WEB_PIN_LAYERS].reverse()) if (this.map.getLayer(id)) this.map.removeLayer(id);
    if (this.map.getSource(WEB_PIN_SOURCE)) this.map.removeSource(WEB_PIN_SOURCE);
    if (this.map.getSource(WEB_ACTIVE_SOURCE)) this.map.removeSource(WEB_ACTIVE_SOURCE);
    for (const id of this.map.listImages()) if (id.startsWith(PIN_IMAGE_PREFIX) || id.startsWith(CLUSTER_IMAGE_PREFIX)) this.map.removeImage(id);
  }
}
