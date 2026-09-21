import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { View } from "react-native";
import { ListingAmberPillView } from "@/components/listings/ListingAmberPill";
import type { CardBadgeDropTarget } from "@/lib/cardBadgeSelection";
import { isHighlightCardBadge } from "@/lib/listingCardBadges";
import type { BadgeDragSource, CardBadgeDrag, CardBadgeDragOptions } from "./useCardBadgeDrag.types";

type Point = { x: number; y: number };
type Drag = {
  key: string;
  pointerId: number;
  origin: Point;
  offset: Point;
  started: boolean;
};
type PointerStart = {
  nativeEvent: PointerEvent;
  target: EventTarget;
  currentTarget: EventTarget;
};

/** Pointer events support mouse, pen and touch; no HTML drag-and-drop dependency. */
export function useCardBadgeDrag(options: CardBadgeDragOptions): CardBadgeDrag {
  const owner = useId();
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const dragRef = useRef<Drag | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [visual, setVisual] = useState<{
    key: string;
    point: Point;
    offset: Point;
    target: CardBadgeDropTarget;
  } | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  function findTarget(point: Point): CardBadgeDropTarget {
    const zone = document.elementFromPoint(point.x, point.y)
      ?.closest<HTMLElement>("[data-badge-zone]");
    if (!zone || zone.dataset.badgeOwner !== owner) return null;
    if (zone.dataset.badgeZone === "pool") return { zone: "pool" };
    // Wrapped rows are hit-tested in reading order, using each chip's midpoint.
    const badges = Array.from(zone.querySelectorAll<HTMLElement>("[data-badge-source='card']"));
    for (let index = 0; index < badges.length; index++) {
      const rect = badges[index].getBoundingClientRect();
      if (point.y < rect.top || (point.y <= rect.bottom && point.x < rect.left + rect.width / 2)) {
        return { zone: "card", index };
      }
    }
    return { zone: "card", index: badges.length };
  }

  function begin(key: string, event: PointerStart) {
    const e = event.nativeEvent;
    if (e.button !== 0 || dragRef.current) return;
    if ((event.target as HTMLElement).closest?.("[data-badge-control]")) return;
    cleanupRef.current?.();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const drag: Drag = {
      key,
      pointerId: e.pointerId,
      origin: { x: e.clientX, y: e.clientY },
      offset: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      started: false,
    };
    dragRef.current = drag;
    let point = drag.origin;
    let frame = 0;
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;

    function show() {
      setVisual({ key, point, offset: drag.offset, target: findTarget(point) });
    }

    function autoScroll() {
      if (!dragRef.current?.started) return;
      // Find the wizard's nearest vertically scrollable ancestor beneath the pointer.
      let el = document.elementFromPoint(point.x, point.y) as HTMLElement | null;
      while (el) {
        const overflow = getComputedStyle(el).overflowY;
        if (/(auto|scroll)/.test(overflow) && el.scrollHeight > el.clientHeight) {
          const rect = el.getBoundingClientRect();
          const top = Math.max(0, rect.top);
          const bottom = Math.min(window.innerHeight, rect.bottom);
          const distance = point.y < top + 60 ? point.y - top - 60
            : point.y > bottom - 60 ? point.y - bottom + 60 : 0;
          if (distance) {
            el.scrollTop += Math.max(-14, Math.min(14, distance / 4));
            show();
          }
          break;
        }
        el = el.parentElement;
      }
      frame = requestAnimationFrame(autoScroll);
    }

    function move(e: PointerEvent) {
      if (e.pointerId !== drag.pointerId) return;
      point = { x: e.clientX, y: e.clientY };
      if (!drag.started && Math.hypot(point.x - drag.origin.x, point.y - drag.origin.y) < 6) return;
      if (!drag.started) {
        drag.started = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        frame = requestAnimationFrame(autoScroll);
      }
      show();
    }

    function preventTouchScroll(e: TouchEvent) {
      // Pointer events track the drag; cancelling its touchmove prevents the
      // browser from starting a fling that would consume the following tap.
      if (drag.started && e.cancelable) e.preventDefault();
    }

    function cleanup() {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("touchmove", preventTouchScroll, true);
      window.removeEventListener("pointerup", end, true);
      window.removeEventListener("pointercancel", cancel, true);
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("blur", cancel);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      dragRef.current = null;
      cleanupRef.current = null;
    }

    function suppressReleaseClick() {
      // End the drag without cancelling pointerup: cancelling it can swallow
      // the following tap on touch browsers. Suppress only this gesture's click.
      function release() {
        clearTimeout(timer);
        window.removeEventListener("click", suppress, true);
        window.removeEventListener("pointerdown", release, true);
        cleanupRef.current = null;
      }
      function suppress(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        release();
      }
      const timer = window.setTimeout(release, 700);
      window.addEventListener("click", suppress, true);
      window.addEventListener("pointerdown", release, true);
      cleanupRef.current = release;
    }

    function end(e: PointerEvent) {
      if (e.pointerId !== drag.pointerId) return;
      const started = drag.started;
      const target = findTarget({ x: e.clientX, y: e.clientY });
      cleanup();
      setVisual(null);
      if (started) {
        suppressReleaseClick();
        optionsRef.current.onDrop(key, target);
      }
    }

    function cancel() {
      const started = drag.started;
      cleanup();
      setVisual(null);
      if (started) suppressReleaseClick();
    }

    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    }

    cleanupRef.current = cleanup;
    window.addEventListener("pointermove", move, true);
    window.addEventListener("touchmove", preventTouchScroll, { capture: true, passive: false });
    window.addEventListener("pointerup", end, true);
    window.addEventListener("pointercancel", cancel, true);
    window.addEventListener("keydown", escape, true);
    window.addEventListener("blur", cancel);
  }

  const pill = visual && options.pills.find((candidate) => candidate.key === visual.key);
  return {
    activeKey: visual?.key ?? null,
    target: visual?.target ?? null,
    zoneProps: (zone: BadgeDragSource) => ({ dataSet: { badgeZone: zone, badgeOwner: owner } }),
    badgeProps: (key: string, source: BadgeDragSource) => ({
      dataSet: { badgeKey: key, badgeSource: source },
      onPointerDown: (event: PointerStart) => begin(key, event),
    }),
    overlay: visual && pill ? createPortal(
      <View
        pointerEvents="none"
        style={{
          position: "fixed", zIndex: 10000,
          left: visual.point.x - visual.offset.x,
          top: visual.point.y - visual.offset.y,
          borderRadius: 999,
          boxShadow: "0 6px 18px rgba(18,24,38,0.18)",
        }}
      >
        <ListingAmberPillView pill={pill} highlight={isHighlightCardBadge(pill.key)} />
      </View>, document.body,
    ) : null,
  };
}
