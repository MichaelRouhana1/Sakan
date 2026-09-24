import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Liquid } from "liquid-gooey";
import { Skoun } from "@/constants/theme";
import type { ListingMoreMenuProps } from "@/components/listings/detail/ListingMoreMenu.types";

/** Matches the heart button. Transparent fill so the goo is the surface. */
const BTN: CSSProperties = {
  boxSizing: "border-box",
  width: 34,
  height: 34,
  minWidth: 34,
  margin: 0,
  borderRadius: 17,
  border: "2px solid #C5CDD8",
  background: "transparent",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const SIZE = 34;
/** Space between Copy and Report when open. Pair is centered on the X. */
const GAP = 16;
const OFFSET = (SIZE + GAP) / 2;

/** Same spring as the libraries.dev Gooey playground. */
const SPRING = {
  duration: 550,
  ease: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** Hub sits in the middle of the Liquid box so satellites can split left + right. */
const STACK: CSSProperties = {
  position: "absolute",
  top: 0,
  left: OFFSET,
  width: SIZE,
  height: SIZE,
  margin: 0,
};

function RoundBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} style={BTN}>
      {children}
    </button>
  );
}

export function ListingMoreMenu({
  linkCopied,
  reported,
  onShare,
  onReport,
  canReport = true,
}: ListingMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        width: 34,
        height: 34,
        flexShrink: 0,
        zIndex: 6,
      }}
    >
      {/*
        Playground plus-menu, flipped downward: Copy / Report blob onto Call,
        stacked above the blue bar (header z-index), not off the top of the card.
      */}
      <Liquid
        blur={6.5}
        contrast={18}
        fill="#fff"
        shadow="0 2px 10px rgba(18, 24, 38, 0.14)"
        filterPadding={24}
        style={{
          position: "absolute",
          top: 0,
          left: -OFFSET,
          width: SIZE + OFFSET * 2,
          height: 100,
          pointerEvents: "none",
        }}
      >
        <Liquid.Item
          x={open ? -OFFSET : 0}
          y={open ? 52 : 0}
          scale={open ? 1 : 0}
          transition={SPRING}
          style={{ ...STACK, pointerEvents: open ? "auto" : "none" }}
        >
          <RoundBtn
            label={linkCopied ? "Link copied" : "Copy link"}
            onClick={() => {
              onShare();
            }}
          >
            <Ionicons
              name={linkCopied ? "checkmark" : "link-outline"}
              size={16}
              color={Skoun.color.ink}
            />
          </RoundBtn>
        </Liquid.Item>

        {reported || !canReport ? null : (
          <Liquid.Item
            x={open ? OFFSET : 0}
            y={open ? 52 : 0}
            scale={open ? 1 : 0}
            transition={SPRING}
            delay={40}
            style={{ ...STACK, pointerEvents: open ? "auto" : "none" }}
          >
            <RoundBtn
              label="Report this listing"
              onClick={() => {
                onReport();
              }}
            >
              <Ionicons name="flag-outline" size={16} color={Skoun.color.ink} />
            </RoundBtn>
          </Liquid.Item>
        )}

        <Liquid.Item style={{ ...STACK, pointerEvents: "auto", zIndex: 2 }}>
          <button
            type="button"
            aria-label={open ? "Close listing actions" : "More listing actions"}
            aria-expanded={open}
            aria-haspopup="true"
            onClick={() => setOpen((v) => !v)}
            style={BTN}
          >
            <Ionicons
              name={open ? "close" : "ellipsis-horizontal"}
              size={18}
              color={Skoun.color.ink}
            />
          </button>
        </Liquid.Item>
      </Liquid>
    </div>
  );
}
