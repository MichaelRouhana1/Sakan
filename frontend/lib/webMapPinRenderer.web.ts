/** Web-only rollout selection. Native maps must never import this module. */
export type WebMapPinRenderer = "markers" | "layers";

export type WebMapPinRendererSelection = Readonly<{
  requested: WebMapPinRenderer;
  renderer: WebMapPinRenderer;
  source: "default" | "environment" | "url";
  fallbackReason: "layers-not-available" | null;
}>;

// Layers are the all-web default. Keep explicit marker rollback through the soak.
const LAYERS_AVAILABLE = true;

function validRenderer(value: unknown): WebMapPinRenderer | null {
  if (typeof value !== "string") return null;
  const renderer = value.trim();
  return renderer === "markers" || renderer === "layers" ? renderer : null;
}

export function resolveWebMapPinRenderer(
  configured: unknown,
  search = "",
  layersAvailable = LAYERS_AVAILABLE,
): WebMapPinRendererSelection {
  const environment = validRenderer(configured);
  const override = validRenderer(new URLSearchParams(search).get("mapPins"));
  const requested = override ?? environment ?? "layers";
  const unavailable = requested === "layers" && !layersAvailable;
  return Object.freeze({
    requested,
    renderer: unavailable ? "markers" : requested,
    source: override ? "url" : environment ? "environment" : "default",
    fallbackReason: unavailable ? "layers-not-available" : null,
  });
}

let clientSelection: WebMapPinRendererSelection | undefined;

/** Freeze on first browser use so browse/preview cannot choose different modes. */
export function getWebMapPinRendererSelection(): WebMapPinRendererSelection {
  if (typeof window === "undefined") {
    // Do not let an SSR request seed the browser's page-local selection.
    return resolveWebMapPinRenderer(
      process.env.EXPO_PUBLIC_WEB_MAP_PIN_RENDERER,
      "",
      LAYERS_AVAILABLE,
    );
  }
  return (clientSelection ??= resolveWebMapPinRenderer(
    process.env.EXPO_PUBLIC_WEB_MAP_PIN_RENDERER,
    window.location.search,
    LAYERS_AVAILABLE,
  ));
}

/** Diagnostic attributes for QA; no user-facing controls or global window state. */
export function markWebMapPinRenderer(host: HTMLElement): void {
  const selection = getWebMapPinRendererSelection();
  host.dataset.mapPinRenderer = selection.renderer;
  host.dataset.mapPinRendererRequested = selection.requested;
  host.dataset.mapPinRendererSource = selection.source;
  if (selection.fallbackReason) {
    host.dataset.mapPinRendererFallback = selection.fallbackReason;
  } else {
    delete host.dataset.mapPinRendererFallback;
  }
}
