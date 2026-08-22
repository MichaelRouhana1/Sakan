import { createElement, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Skoun } from "@/constants/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";

export type HoverPoint = { x: number; y: number };

type Props = {
  hoverKey: string | null;
  durationMs?: number;
  seed?: HoverPoint | null;
  onCommit: (id: string) => void;
};

const SIZE = 26;
const STROKE = 2.5;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = (SIZE - STROKE) / 2 - 1;
const CIRC = 2 * Math.PI * R;

/**
 * Pointer-following ring that fills over `durationMs`, then commits.
 * Web-only. Reduced motion skips the wait.
 */
export function HoverCommitCursor({
  hoverKey,
  durationMs = 1000,
  seed = null,
  onCommit,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [pos, setPos] = useState<HoverPoint>(seed ?? { x: -999, y: -999 });
  const [progress, setProgress] = useState(0);
  const committedRef = useRef<string | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    if (seed) setPos(seed);
  }, [seed, hoverKey]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    if (!hoverKey) {
      committedRef.current = null;
      setProgress(0);
      return;
    }

    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove, { passive: true });

    if (reduceMotion) {
      if (committedRef.current !== hoverKey) {
        committedRef.current = hoverKey;
        onCommitRef.current(hoverKey);
      }
      setProgress(1);
      return () => window.removeEventListener("mousemove", onMove);
    }

    committedRef.current = null;
    setProgress(0);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      setProgress(p);
      if (p >= 1) {
        if (committedRef.current !== hoverKey) {
          committedRef.current = hoverKey;
          onCommitRef.current(hoverKey);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, [hoverKey, durationMs, reduceMotion]);

  if (Platform.OS !== "web" || !hoverKey || reduceMotion) return null;

  return createElement(
    "div",
    {
      "aria-hidden": true,
      style: {
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: SIZE,
        height: SIZE,
        marginLeft: -SIZE / 2,
        marginTop: -SIZE / 2,
        pointerEvents: "none",
        zIndex: 99999,
      },
    },
    createElement(
      "svg",
      {
        width: SIZE,
        height: SIZE,
        viewBox: `0 0 ${SIZE} ${SIZE}`,
      },
      createElement("circle", {
        cx: CX,
        cy: CY,
        r: R,
        fill: "rgba(255,255,255,0.92)",
        stroke: "rgba(18,24,38,0.14)",
        strokeWidth: STROKE,
      }),
      createElement("circle", {
        cx: CX,
        cy: CY,
        r: R,
        fill: "none",
        stroke: Skoun.color.primary,
        strokeWidth: STROKE,
        strokeLinecap: "round",
        strokeDasharray: `${CIRC} ${CIRC}`,
        strokeDashoffset: CIRC * (1 - progress),
        transform: `rotate(-90 ${CX} ${CY})`,
      }),
    ),
  );
}
