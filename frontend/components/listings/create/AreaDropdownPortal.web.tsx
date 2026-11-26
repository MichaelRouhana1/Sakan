import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { View } from "react-native";

type Props = {
  open: boolean;
  triggerRef: RefObject<View | null>;
  onClose: () => void;
  reducedMotion?: boolean;
  children: ReactNode;
};

type Rect = {
  top: number;
  bottom: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "below" | "above";
};

const GAP = 6;
const EDGE_PAD = 12;
const PREFERRED_MAX_HEIGHT = 396;

export function AreaDropdownPortal({
  open,
  triggerRef,
  onClose,
  reducedMotion = false,
  children,
}: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    if (!open || typeof window === "undefined") {
      setRect(null);
      return;
    }

    let rafId = 0;

    const measure = () => {
      const node = triggerRef.current as unknown as HTMLElement | null;
      if (!node || typeof node.getBoundingClientRect !== "function") return;
      const box = node.getBoundingClientRect();
      if (box.width < 40 || box.height === 0) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const footerClearance = vw < 1024 ? 148 : 88;
      const headerClearance = vw < 1024 ? 64 : 76;
      const spaceBelow = vh - footerClearance - box.bottom - GAP;
      const spaceAbove = box.top - headerClearance - GAP;
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;

      const available = openAbove ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(180, Math.min(PREFERRED_MAX_HEIGHT, available));
      const width = Math.min(box.width, vw - EDGE_PAD * 2);
      const left = Math.max(EDGE_PAD, Math.min(box.left, vw - width - EDGE_PAD));
      const top = box.bottom + GAP;
      const bottom = vh - box.top + GAP;

      setRect({
        top,
        bottom,
        left,
        width,
        maxHeight,
        placement: openAbove ? "above" : "below",
      });
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    };

    measure();
    const node = triggerRef.current as unknown as HTMLElement | null;
    const ro =
      typeof ResizeObserver !== "undefined" && node
        ? new ResizeObserver(scheduleMeasure)
        : null;
    if (ro && node) ro.observe(node);

    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, triggerRef]);

  useLayoutEffect(() => {
    if (!open || typeof document === "undefined") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        const trigger = triggerRef.current as unknown as HTMLElement | null;
        trigger?.focus?.();
      }
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const trigger = triggerRef.current as unknown as HTMLElement | null;
      if (trigger?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };

    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
    };
  }, [open, onClose, triggerRef]);

  useEffect(() => {
    if (!open || !rect || reducedMotion) return;
    const el = menuRef.current;
    if (!el || typeof el.animate !== "function") return;
    const fromY = rect.placement === "above" ? 5 : -5;
    el.animate(
      [
        { opacity: 0, transform: `translateY(${fromY}px) scale(0.992)` },
        { opacity: 1, transform: "translateY(0px) scale(1)" },
      ],
      { duration: 150, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
  }, [open, Boolean(rect), rect?.placement, reducedMotion]);

  if (!open || !rect || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      data-testid="location-area-menu"
      role="dialog"
      aria-label="Select area"
      style={{
        position: "fixed",
        ...(rect.placement === "above"
          ? { bottom: rect.bottom }
          : { top: rect.top }),
        left: rect.left,
        width: rect.width,
        maxHeight: rect.maxHeight,
        zIndex: 600,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        border: "1px solid rgba(26, 26, 26, 0.14)",
        boxShadow:
          "0 16px 40px rgba(26, 26, 26, 0.14), 0 4px 12px rgba(26, 26, 26, 0.06)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
