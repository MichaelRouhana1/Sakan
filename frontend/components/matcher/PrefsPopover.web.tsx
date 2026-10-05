import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { View } from "react-native";
import { Skoun } from "@/constants/theme";

const panel: CSSProperties = {
  position: "fixed",
  zIndex: 80,
  width: 260,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 12,
  borderRadius: 12,
  background: Skoun.color.surface,
  border: `1px solid ${Skoun.color.bgWash}`,
  boxShadow: "0 12px 28px rgba(18, 24, 38, 0.14)",
};

/** Drawn on document.body so listing cards cannot cover it. */
export function PrefsPopover({
  open,
  anchorRef,
  onEnter,
  onLeave,
  children,
}: {
  open: boolean;
  anchorRef?: RefObject<View | null>;
  onEnter?: () => void;
  onLeave?: () => void;
  children: ReactNode;
}) {
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const node = anchorRef?.current as unknown as HTMLElement | null;
    if (!node?.getBoundingClientRect) return;
    const place = () => {
      const rect = node.getBoundingClientRect();
      setBox({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 272)),
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, anchorRef]);

  if (!open || !box || typeof document === "undefined") return null;
  return createPortal(
    <div onMouseEnter={onEnter} onMouseLeave={onLeave} style={{ ...panel, top: box.top, left: box.left }}>
      {children}
    </div>,
    document.body,
  );
}
