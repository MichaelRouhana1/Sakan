import { useEffect, useRef } from "react";
import {
  CAP_DASHES,
  CAP_VIEW,
  CAP_VIEWBOX,
  lineDelta,
} from "@/components/campus/heroCapGeometry";
import { Skoun } from "@/constants/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";

const RADIUS = 110;
const EASE = 0.12;
const SETTLE = 0.02;
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Graduation cap made of dashes that swing toward the pointer like iron
 * filings near a magnet. Works on the DOM directly — no React re-render
 * per frame. Static on touch and under prefers-reduced-motion.
 */
export function HeroCap() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const reducedPref = useReducedMotion();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const reducedMedia =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reducedPref || reducedMedia || !finePointer) return;

    const n = CAP_DASHES.length;
    const cur = new Float32Array(n);
    for (let i = 0; i < n; i++) cur[i] = CAP_DASHES[i]!.rest;

    let cursor: { x: number; y: number } | null = null;
    let raf = 0;

    const tick = () => {
      raf = 0;
      let active = false;
      for (let i = 0; i < n; i++) {
        const d = CAP_DASHES[i]!;
        const el = lineRefs.current[i];
        if (!el) continue;

        let target = d.rest;
        let pull = 0;
        if (cursor) {
          const dx = cursor.x - d.x;
          const dy = cursor.y - d.y;
          pull = 1 / (1 + (dx * dx + dy * dy) / (RADIUS * RADIUS));
          const toward = Math.atan2(dy, dx) * DEG;
          target = d.rest + lineDelta(d.rest, toward) * pull;
        }

        const delta = lineDelta(cur[i]!, target);
        if (Math.abs(delta) > SETTLE) {
          cur[i] = cur[i]! + delta * EASE;
          active = true;
        } else if (cur[i] !== target) {
          cur[i] = target;
        }

        const a = cur[i]! * RAD;
        const hx = Math.cos(a) * d.len * 0.5;
        const hy = Math.sin(a) * d.len * 0.5;
        el.setAttribute("x1", String(d.x - hx));
        el.setAttribute("y1", String(d.y - hy));
        el.setAttribute("x2", String(d.x + hx));
        el.setAttribute("y2", String(d.y + hy));
        el.setAttribute("opacity", String(Math.min(1, d.o + pull * 0.3)));
      }
      if (active) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const toViewBox = (clientX: number, clientY: number) => {
      const rect = svg.getBoundingClientRect();
      const scale = Math.min(rect.width / CAP_VIEW.w, rect.height / CAP_VIEW.h);
      const ox = (rect.width - CAP_VIEW.w * scale) / 2;
      const oy = (rect.height - CAP_VIEW.h * scale) / 2;
      return {
        x: CAP_VIEW.x + (clientX - rect.left - ox) / scale,
        y: CAP_VIEW.y + (clientY - rect.top - oy) / scale,
      };
    };

    const onMove = (e: PointerEvent) => {
      cursor = toViewBox(e.clientX, e.clientY);
      wake();
    };
    const onLeave = () => {
      cursor = null;
      wake();
    };

    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerleave", onLeave);
    return () => {
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedPref]);

  return (
    <svg
      ref={svgRef}
      viewBox={CAP_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", touchAction: "pan-y" }}
    >
      <g
        stroke={Skoun.color.primary}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      >
        {CAP_DASHES.map((d, i) => {
          const a = d.rest * RAD;
          const hx = Math.cos(a) * d.len * 0.5;
          const hy = Math.sin(a) * d.len * 0.5;
          return (
            <line
              key={i}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              x1={d.x - hx}
              y1={d.y - hy}
              x2={d.x + hx}
              y2={d.y + hy}
              opacity={d.o}
            />
          );
        })}
      </g>
    </svg>
  );
}
