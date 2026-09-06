import { gsap } from "gsap";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  capMapper,
  isCapPoint,
  type Frame,
} from "@/components/campus/shelved/dotCapMask";
import { useReducedMotion } from "@/lib/useReducedMotion";

gsap.registerPlugin(InertiaPlugin);

export type HeroDotGridProps = {
  /** Diameter of each dot in px. */
  dotSize?: number;
  /** Gap between dots in px. */
  gap?: number;
  /** Colour of background dots at rest. */
  baseColor?: string;
  /** Colour background dots blend toward under the pointer. */
  activeColor?: string;
  /** Pixel frame (relative to the grid) the cap is `contain`-fitted into. */
  capFrame?: Frame | null;
  /** Colour of the cap's dots at rest. */
  capColor?: string;
  /** Colour the cap's dots blend toward under the pointer. */
  capActiveColor?: string;
  /** Radius (px) around the pointer within which dots recolour. */
  proximity?: number;
  /** Pointer speed (px/s) above which dots get pushed. */
  speedTrigger?: number;
  /** Radius (px) of the click shockwave. */
  shockRadius?: number;
  /** Strength of the click shockwave. */
  shockStrength?: number;
  /** Cap on pointer speed used for the push. */
  maxSpeed?: number;
  /** Inertia resistance — higher settles sooner. */
  resistance?: number;
  /** Seconds for a dot to spring back home. */
  returnDuration?: number;
};

type Dot = {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  cap: boolean;
  pushed: boolean;
};

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1]!, 16),
    g: parseInt(m[2]!, 16),
    b: parseInt(m[3]!, 16),
  };
}

function mix(a: Rgb, b: Rgb, t: number): string {
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

const FAR = -1e6;
const MOVE_THROTTLE_MS = 16;

/**
 * SHELVED — not rendered anywhere. Tried as a replacement for the hero's
 * HeroRipple + HeroCap; kept for reference. To try it again: render inside
 * the hero's absolute background host and pass the visual slot's onLayout
 * frame as `capFrame` (see git history of CampusHomePage.tsx).
 *
 * React Bits' DotGrid, ported to TS and adapted for the campus hero: a
 * subset of dots is tagged as the graduation cap and gets its own
 * rest/active colours. Draws straight to a canvas — no React re-render per
 * frame — and idles when nothing is moving. Static (no physics, no hover
 * tint) on touch and under prefers-reduced-motion.
 */
export function HeroDotGrid({
  dotSize = 4,
  gap = 10,
  baseColor = "#C5CDD8",
  activeColor = "#2F6FED",
  capFrame = null,
  capColor = "#2F6FED",
  capActiveColor = "#121826",
  proximity = 120,
  speedTrigger = 100,
  shockRadius = 220,
  shockStrength = 4,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
}: HeroDotGridProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const pointerRef = useRef({
    x: FAR,
    y: FAR,
    inside: false,
    lastTime: 0,
    lastX: 0,
    lastY: 0,
  });
  const tweensRef = useRef(0);
  const rafRef = useRef(0);
  const reducedPref = useReducedMotion();

  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor]);
  const activeRgb = useMemo(() => hexToRgb(activeColor), [activeColor]);
  const capRgb = useMemo(() => hexToRgb(capColor), [capColor]);
  const capActiveRgb = useMemo(() => hexToRgb(capActiveColor), [capActiveColor]);

  const circlePath = useMemo(() => {
    if (typeof window === "undefined" || !window.Path2D) return null;
    const p = new window.Path2D();
    p.arc(0, 0, dotSize / 2, 0, Math.PI * 2);
    return p;
  }, [dotSize]);

  // Frame as a stable key so the grid only rebuilds when it really changes.
  const frameKey = capFrame
    ? `${Math.round(capFrame.x)},${Math.round(capFrame.y)},${Math.round(capFrame.w)},${Math.round(capFrame.h)}`
    : "";

  const draw = useCallback(() => {
    rafRef.current = 0;
    const canvas = canvasRef.current;
    if (!canvas || !circlePath) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { x: px, y: py } = pointerRef.current;
    const proxSq = proximity * proximity;

    for (const dot of dotsRef.current) {
      const dx = dot.cx - px;
      const dy = dot.cy - py;
      const dsq = dx * dx + dy * dy;

      let fill = dot.cap ? capColor : baseColor;
      if (dsq <= proxSq) {
        const t = 1 - Math.sqrt(dsq) / proximity;
        fill = dot.cap
          ? mix(capRgb, capActiveRgb, t)
          : mix(baseRgb, activeRgb, t);
      }

      ctx.save();
      ctx.translate(dot.cx + dot.xOffset, dot.cy + dot.yOffset);
      ctx.fillStyle = fill;
      ctx.fill(circlePath);
      ctx.restore();
    }

    // Keep animating only while something can still change on screen.
    if (pointerRef.current.inside || tweensRef.current > 0) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [
    circlePath,
    proximity,
    baseColor,
    capColor,
    baseRgb,
    activeRgb,
    capRgb,
    capActiveRgb,
  ]);

  const wake = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const buildGrid = useCallback(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const { width, height } = host.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    const cell = dotSize + gap;
    const cols = Math.floor((width + gap) / cell);
    const rows = Math.floor((height + gap) / cell);
    const gridW = cell * cols - gap;
    const gridH = cell * rows - gap;
    const startX = (width - gridW) / 2 + dotSize / 2;
    const startY = (height - gridH) / 2 + dotSize / 2;

    const mapper =
      capFrame && capFrame.w > 0 && capFrame.h > 0 ? capMapper(capFrame) : null;
    // Half a cell in cap units, so thin tassel parts still catch a dot.
    const tol = mapper ? (cell * 0.5) / mapper.scale : 0;

    const dots: Dot[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = startX + x * cell;
        const cy = startY + y * cell;
        let cap = false;
        if (mapper) {
          const p = mapper.toCap(cx, cy);
          cap = isCapPoint(p.x, p.y, tol);
        }
        dots.push({ cx, cy, xOffset: 0, yOffset: 0, cap, pushed: false });
      }
    }
    dotsRef.current = dots;
    wake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dotSize, gap, frameKey, wake]);

  // Build + resize.
  useEffect(() => {
    buildGrid();
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(buildGrid);
    ro.observe(host);
    return () => ro.disconnect();
  }, [buildGrid]);

  // Redraw when colours / proximity change.
  useEffect(() => {
    wake();
  }, [wake]);

  // Stop the loop on unmount.
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      gsap.killTweensOf(dotsRef.current);
    },
    [],
  );

  // Pointer interaction — fine pointers only, and never under reduced motion.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMedia =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reducedPref || reducedMedia || !finePointer) return;

    const push = (dot: Dot, pushX: number, pushY: number) => {
      dot.pushed = true;
      tweensRef.current += 1;
      gsap.killTweensOf(dot);
      gsap.to(dot, {
        inertia: { xOffset: pushX, yOffset: pushY, resistance },
        onComplete: () => {
          gsap.to(dot, {
            xOffset: 0,
            yOffset: 0,
            duration: returnDuration,
            ease: "elastic.out(1,0.75)",
            onComplete: () => {
              tweensRef.current = Math.max(0, tweensRef.current - 1);
            },
          });
          dot.pushed = false;
        },
      });
      wake();
    };

    let lastMove = 0;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const pr = pointerRef.current;
      const rect = host.getBoundingClientRect();
      pr.x = e.clientX - rect.left;
      pr.y = e.clientY - rect.top;
      pr.inside = true;
      wake();

      if (now - lastMove < MOVE_THROTTLE_MS) return;
      lastMove = now;

      const dt = pr.lastTime ? now - pr.lastTime : 16;
      const dx = e.clientX - pr.lastX;
      const dy = e.clientY - pr.lastY;
      let vx = (dx / dt) * 1000;
      let vy = (dy / dt) * 1000;
      let speed = Math.hypot(vx, vy);
      if (speed > maxSpeed) {
        const s = maxSpeed / speed;
        vx *= s;
        vy *= s;
        speed = maxSpeed;
      }
      pr.lastTime = now;
      pr.lastX = e.clientX;
      pr.lastY = e.clientY;

      if (speed <= speedTrigger) return;
      for (const dot of dotsRef.current) {
        if (dot.pushed) continue;
        const dist = Math.hypot(dot.cx - pr.x, dot.cy - pr.y);
        if (dist < proximity) {
          push(dot, dot.cx - pr.x + vx * 0.005, dot.cy - pr.y + vy * 0.005);
        }
      }
    };

    const onLeave = () => {
      const pr = pointerRef.current;
      pr.x = FAR;
      pr.y = FAR;
      pr.inside = false;
      pr.lastTime = 0;
      wake();
    };

    const onClick = (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      for (const dot of dotsRef.current) {
        if (dot.pushed) continue;
        const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
        if (dist < shockRadius) {
          const falloff = Math.max(0, 1 - dist / shockRadius);
          push(
            dot,
            (dot.cx - cx) * shockStrength * falloff,
            (dot.cy - cy) * shockStrength * falloff,
          );
        }
      }
    };

    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("click", onClick);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("click", onClick);
    };
  }, [
    reducedPref,
    wake,
    maxSpeed,
    speedTrigger,
    proximity,
    resistance,
    returnDuration,
    shockRadius,
    shockStrength,
  ]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          display: "block",
        }}
      />
    </div>
  );
}
