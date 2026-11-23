import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  type WheelEvent,
} from "react";

/** Measured on Amber's live home page; see artifacts/home-cards-rea/HOVER-PLAN.md. */
export const PREVIEW_OPEN_DELAY_MS = 550;
export const PREVIEW_CLOSE_DELAY_MS = 140;
/** Same cut-off as `DesktopDesign.layout.minWidth`. */
export const PREVIEW_MIN_VIEWPORT_WIDTH = 900;
/** Fixed; deliberately not multiplied by the 1.1 desktop scale. */
export const PREVIEW_WIDTH = 340;
export const PREVIEW_VIEWPORT_MARGIN = 16;
/** How far the panel rises above the card it grows out of. */
export const PREVIEW_RISE = 28;

export type PreviewAnchor = {
  left: number;
  top: number;
  fromScale: string;
  originX: number;
  originY: number;
  via: "pointer" | "keyboard";
};

export function canShowHomePreview(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    window.innerWidth >= PREVIEW_MIN_VIEWPORT_WIDTH
  );
}

export function computePreviewAnchor(rect: DOMRect, via: PreviewAnchor["via"]): PreviewAnchor {
  const centerX = rect.left + rect.width / 2;
  // clientWidth excludes the page scrollbar, so the 16px margin is visible space.
  const viewportWidth = document.documentElement.clientWidth;
  const left = Math.min(
    Math.max(centerX - PREVIEW_WIDTH / 2, PREVIEW_VIEWPORT_MARGIN),
    viewportWidth - PREVIEW_WIDTH - PREVIEW_VIEWPORT_MARGIN,
  );
  const top = Math.max(rect.top - PREVIEW_RISE, PREVIEW_VIEWPORT_MARGIN);
  return {
    left,
    top,
    fromScale: (rect.width / PREVIEW_WIDTH).toFixed(3),
    originX: centerX - left,
    originY: rect.top + rect.height / 2 - top,
    via,
  };
}

/** Nearest ancestor of `node` that can scroll on `axis` (the page itself is not one of them). */
function scrollableAncestor(node: HTMLElement | null, axis: "x" | "y"): HTMLElement | null {
  for (let el = node?.parentElement ?? null; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    const style = getComputedStyle(el);
    const overflow = axis === "y" ? style.overflowY : style.overflowX;
    const room = axis === "y" ? el.scrollHeight > el.clientHeight + 1 : el.scrollWidth > el.clientWidth + 1;
    if (room && (overflow === "auto" || overflow === "scroll")) return el;
  }
  return null;
}

/**
 * Open/close intent for the home card preview panel.
 *
 * Pointer: opens PREVIEW_OPEN_DELAY_MS after entering the card, unless the heart is hovered or was
 * used. Closes PREVIEW_CLOSE_DELAY_MS after leaving both card and panel, and immediately on
 * scroll, resize or Escape.
 * Keyboard: opens as soon as the card link gains :focus-visible. Focus can move into the panel
 * (arrows, heart) without closing it; it closes when focus leaves card link and panel, or on Escape.
 */
export function useHomeCardPreview(
  cardRef: RefObject<HTMLElement | null>,
  linkRef: RefObject<HTMLAnchorElement | null>,
  panelRef: RefObject<HTMLDivElement | null>,
) {
  const [anchor, setAnchor] = useState<PreviewAnchor | null>(null);
  const openRef = useRef(false);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const heartHovered = useRef(false);
  const heartUsed = useRef(false);
  const ignoreFocusOpen = useRef(false);
  // Set by Escape: the panel leaving from under a still pointer makes the browser re-fire
  // mouseenter on the card, which must not re-arm the open until the pointer really leaves.
  const dismissed = useRef(false);
  const pointerInside = useRef(false);

  const clearOpenTimer = useCallback(() => {
    window.clearTimeout(openTimer.current);
    openTimer.current = undefined;
  }, []);
  const clearCloseTimer = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
  }, []);

  // When the panel unmounts from under the pointer the browser never delivers a mouseleave to the
  // card, so "pointer inside / heart used / dismissed" would go stale and swallow the next hover.
  // After any close, re-validate on the next mouse move: once the pointer is seen outside the card
  // and panel, forget all of it.
  const leaveWatch = useRef<((event: MouseEvent) => void) | null>(null);
  const stopWatchingPointer = useCallback(() => {
    if (leaveWatch.current) document.removeEventListener("mousemove", leaveWatch.current, true);
    leaveWatch.current = null;
  }, []);
  const watchPointerLeave = useCallback(() => {
    if (leaveWatch.current) return;
    const onMove = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && (cardRef.current?.contains(target) || panelRef.current?.contains(target))) return;
      stopWatchingPointer();
      pointerInside.current = false;
      heartHovered.current = false;
      heartUsed.current = false;
      dismissed.current = false;
    };
    leaveWatch.current = onMove;
    document.addEventListener("mousemove", onMove, true);
  }, [cardRef, panelRef, stopWatchingPointer]);

  const close = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    openRef.current = false;
    setAnchor(null);
    if (pointerInside.current) watchPointerLeave();
  }, [clearCloseTimer, clearOpenTimer, watchPointerLeave]);

  const show = useCallback(
    (via: PreviewAnchor["via"]) => {
      const node = cardRef.current;
      clearCloseTimer();
      if (!node || openRef.current || !canShowHomePreview()) return;
      openRef.current = true;
      setAnchor(computePreviewAnchor(node.getBoundingClientRect(), via));
    },
    [cardRef, clearCloseTimer],
  );

  const scheduleOpen = useCallback(() => {
    clearCloseTimer();
    if (openRef.current || dismissed.current || heartHovered.current || heartUsed.current) return;
    clearOpenTimer();
    openTimer.current = window.setTimeout(() => {
      openTimer.current = undefined;
      if (heartHovered.current || heartUsed.current) return;
      show("pointer");
    }, PREVIEW_OPEN_DELAY_MS);
  }, [clearCloseTimer, clearOpenTimer, show]);

  const scheduleClose = useCallback(() => {
    clearOpenTimer();
    if (!openRef.current) return;
    clearCloseTimer();
    closeTimer.current = window.setTimeout(close, PREVIEW_CLOSE_DELAY_MS);
  }, [clearCloseTimer, clearOpenTimer, close]);

  const isOpen = anchor !== null;
  useEffect(() => {
    if (!isOpen) return;
    const onViewportChange = () => close();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const focusInPanel = panelRef.current?.contains(document.activeElement) ?? false;
      dismissed.current = pointerInside.current;
      close();
      if (focusInPanel) {
        ignoreFocusOpen.current = true;
        linkRef.current?.focus({ preventScroll: true });
        ignoreFocusOpen.current = false;
      }
    };
    window.addEventListener("scroll", onViewportChange, { capture: true, passive: true });
    window.addEventListener("resize", onViewportChange);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onViewportChange, { capture: true });
      window.removeEventListener("resize", onViewportChange);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, isOpen, linkRef, panelRef]);

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
      stopWatchingPointer();
    },
    [stopWatchingPointer],
  );

  const focusablesInPanel = () =>
    Array.from(panelRef.current?.querySelectorAll<HTMLElement>("button") ?? []);

  const cardProps = {
    onMouseEnter: () => {
      pointerInside.current = true;
      scheduleOpen();
    },
    onMouseLeave: () => {
      pointerInside.current = false;
      heartHovered.current = false;
      heartUsed.current = false;
      dismissed.current = false;
      scheduleClose();
    },
    // Focus on anything in the card other than the body link (its own heart or arrows) closes the
    // panel, which would otherwise cover them. Focus inside the panel bubbles here through the
    // React tree and is ignored.
    onFocus: (event: FocusEvent<HTMLElement>) => {
      const target = event.target as Node;
      if (target === linkRef.current || panelRef.current?.contains(target)) return;
      close();
    },
  };

  const heartProps = {
    onMouseEnter: () => {
      heartHovered.current = true;
      clearOpenTimer();
    },
    onMouseLeave: () => {
      heartHovered.current = false;
      scheduleOpen();
    },
    onClickCapture: () => {
      // Only a pointer click means "the pointer is busy with the heart"; keyboard activation
      // with the pointer elsewhere must not suppress the next hover.
      if (pointerInside.current) heartUsed.current = true;
      clearOpenTimer();
    },
  };

  const linkProps = {
    onFocus: (event: FocusEvent<HTMLAnchorElement>) => {
      if (ignoreFocusOpen.current) return;
      if (event.currentTarget.matches(":focus-visible")) show("keyboard");
    },
    onBlur: (event: FocusEvent<HTMLAnchorElement>) => {
      const next = event.relatedTarget as Node | null;
      if (next && panelRef.current?.contains(next)) return;
      close();
    },
    onKeyDown: (event: KeyboardEvent<HTMLAnchorElement>) => {
      if (event.key !== "Tab" || event.shiftKey || !openRef.current) return;
      const first = focusablesInPanel()[0];
      if (!first) return;
      event.preventDefault();
      first.focus();
    },
  };

  const panelProps = {
    onMouseEnter: clearCloseTimer,
    onMouseLeave: scheduleClose,
    // The panel lives under <body>, outside the page's own scroll container, so a wheel over it
    // would otherwise be swallowed. Close it and pass the scroll on to the card's containers.
    onWheel: (event: WheelEvent<HTMLElement>) => {
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const vertical = scrollableAncestor(cardRef.current, "y");
      const horizontal = scrollableAncestor(cardRef.current, "x");
      close();
      vertical?.scrollBy({ top: event.deltaY * unit });
      horizontal?.scrollBy({ left: event.deltaX * unit });
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      const next = event.relatedTarget as Node | null;
      if (next && (panelRef.current?.contains(next) || next === linkRef.current)) return;
      close();
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Tab") return;
      const controls = focusablesInPanel();
      if (!controls.length) return;
      const active = document.activeElement;
      if (event.shiftKey && active === controls[0]) {
        event.preventDefault();
        linkRef.current?.focus();
      } else if (!event.shiftKey && active === controls[controls.length - 1]) {
        // Hand focus back to the card link and let the browser's default Tab continue from there.
        linkRef.current?.focus();
      }
    },
  };

  return { anchor, close, cardProps, heartProps, linkProps, panelProps };
}
