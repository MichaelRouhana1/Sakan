import { useEffect, useMemo, useRef } from "react";
import type { MapPinGroup } from "@/lib/mapPinGroups";
import { amberPopupHtml } from "@/lib/studentlyMapbox.web";
import { webMapPopupHtml } from "@/lib/webMapPopup.web";

/** One nonmodal card. Map gestures stay available outside its scrollable body. */
export function MobileMapSelection({
  group,
  layerMode = false,
  onClose,
  onInsetChange,
}: {
  group: MapPinGroup;
  layerMode?: boolean;
  onClose: () => void;
  onInsetChange: (height: number) => void;
}) {
  const host = useRef<HTMLElement | null>(null);
  // Reuse the existing escaped listing markup and its detail-link behavior.
  const html = useMemo(() => layerMode ? webMapPopupHtml(group) : amberPopupHtml(group), [group, layerMode]);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    // Include the lower gap so arrows use the entire unobscured map area.
    const measure = () => {
      const box = node.getBoundingClientRect();
      onInsetChange((node.parentElement?.getBoundingClientRect().bottom ?? box.bottom) - box.top);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => {
      observer.disconnect();
      onInsetChange(0);
    };
  }, [onInsetChange]);

  return (
    <section
      ref={host}
      className="studently-mobile-map-card"
      data-testid="mobile-map-selection"
      aria-label="Selected accommodation"
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <style>{`
        .studently-mobile-map-card {
          position: absolute; z-index: 1100; left: 12px; right: 12px;
          bottom: max(36px, calc(env(safe-area-inset-bottom) + 12px)); max-height: 45%;
          display: flex; flex-direction: column; min-height: 0; box-sizing: border-box;
          border: 1px solid #E2E8F0; border-radius: 16px; background: #fff;
          box-shadow: 0 8px 24px rgba(18,24,38,.16); overflow: hidden;
          color: #0F172A; font: 13px "DM Sans", system-ui, sans-serif;
        }
        .studently-mobile-map-card header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px; padding: 0 4px 0 14px; min-height: 48px; flex-shrink: 0;
          border-bottom: 1px solid #E2E8F0; font-weight: 700;
        }
        .studently-mobile-map-card header button {
          width: 44px; height: 44px; flex-shrink: 0; border: 0; border-radius: 12px;
          background: #fff; color: #475569; font-size: 20px; cursor: pointer;
          touch-action: manipulation;
        }
        .studently-mobile-map-card a:focus-visible,
        .studently-mobile-map-card button:focus-visible { outline: 2px solid var(--sk-primary); outline-offset: -3px; }
        .studently-mobile-map-card-content {
          min-height: 0; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y;
        }
        .studently-mobile-map-card .studently-amber-popup-card {
          width: 100%; box-sizing: border-box; border-radius: 0;
        }
        .studently-mobile-map-card .studently-popup-close-btn,
        .studently-mobile-map-card .studently-popup-group-header { display: none; }
        .studently-mobile-map-card .studently-popup-body-link { display: flex; min-height: 116px; }
        .studently-mobile-map-card .studently-popup-media { width: 104px; height: auto; flex-shrink: 0; }
        .studently-mobile-map-card .studently-popup-body { flex: 1; min-width: 0; }
        .studently-mobile-map-card .studently-popup-title,
        .studently-mobile-map-card .studently-popup-subtitle { white-space: normal; overflow-wrap: anywhere; }
        .studently-mobile-map-card .studently-popup-group-list { max-height: none; overflow: visible; }
        .studently-mobile-map-card .studently-amber-popup-composite { max-height: none; overflow: visible; }
        .studently-mobile-map-card .studently-popup-group-item { min-height: 52px; gap: 12px; }
        .studently-mobile-map-card .studently-popup-group-title { max-width: none; white-space: normal; overflow-wrap: anywhere; }
        .studently-mobile-map-card .studently-popup-group-price { flex-shrink: 0; }
      `}</style>
      <header>
        <span>{group.count > 1 ? `${group.count} ${layerMode ? "listings" : "matching units"} at this pin` : "Selected accommodation"}</span>
        <button type="button" aria-label="Close" onClick={onClose}>×</button>
      </header>
      <div className="studently-mobile-map-card-content" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
