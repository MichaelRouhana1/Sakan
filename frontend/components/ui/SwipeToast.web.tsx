/** Swipe-to-dismiss toast adapted from React Bits (MIT). */
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

import "./SwipeToast.css";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const FLICK = 0.11;
const DEAD_ZONE = 3;
const RESIST_PX = 24;
const COLLAPSE_MS = 200;
const EXIT = 0.7;
const BURN = [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }];
const HAS_STARTING_STYLE =
  typeof window !== "undefined" && "CSSStartingStyleRule" in window;

export type SwipeToastReason =
  | "timeout"
  | "swipe"
  | "escape"
  | "action"
  | "programmatic";

type SwipeToastProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  open?: boolean;
  onClose?: (reason: SwipeToastReason) => void;
  background?: string;
  color?: string;
  fuseColor?: string;
  width?: number;
  radius?: number;
  slideMs?: number;
  settleBounce?: number;
  swipeDistance?: number;
  duration?: number;
  fuse?: "bottom" | "top" | "none";
  pauseOnHover?: boolean;
  inline?: boolean;
  dismissible?: boolean;
  placement?: "default" | "above-footer";
  stack?: number;
  layer?: number;
  className?: string;
};

type Drag = {
  id: number;
  startY: number;
  grab: number | null;
  moved: boolean;
  hist: [number, number][];
};

const rubberband = (over: number, dim: number, c = 0.55) =>
  (over * dim * c) / (dim + c * Math.abs(over));

const velocityOf = (hist: [number, number][]) => {
  if (hist.length < 2) return 0;
  const [t0, y0] = hist[0];
  const [t1, y1] = hist[hist.length - 1];
  return performance.now() - t1 > 100 ? 0 : (y1 - y0) / Math.max(1, t1 - t0);
};

export function SwipeToast({
  title = "Image Deleted",
  description = "",
  actionLabel = "Undo",
  onAction,
  open = true,
  onClose,
  background = "#ffffff",
  color = "#121826",
  fuseColor = "#ed2f2f",
  width = 280,
  radius = 10,
  slideMs = 400,
  settleBounce = 0.2,
  swipeDistance = 40,
  duration = 4000,
  fuse = "bottom",
  pauseOnHover = true,
  inline = false,
  dismissible = true,
  placement = "default",
  stack = 0,
  layer = 0,
  className = "",
}: SwipeToastProps) {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<"open" | "closing" | "gone">("open");
  const [instant, setInstant] = useState(false);
  const [mounted, setMounted] = useState(HAS_STARTING_STYLE);
  const cardRef = useRef<HTMLDivElement>(null);
  const fuseRef = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);
  const drag = useRef<Drag | null>(null);
  const flags = useRef({
    hover: false,
    interacting: false,
    focus: false,
    hidden: false,
  });
  const lastInput = useRef<"pointer" | "keyboard">("pointer");
  const pendingClose = useRef<SwipeToastReason | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const leaving = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const latest = useRef({ onClose, onAction, slideMs, inline });
  latest.current = { onClose, onAction, slideMs, inline };

  const y = useMotionValue(0);
  const fade = useMotionValue(1);
  const transform = useTransform(y, (value) => `translateY(${value}px)`);

  const syncFuse = () => {
    const current = anim.current;
    if (!current) return;
    const flag = flags.current;
    if (flag.hover || flag.interacting || flag.focus || flag.hidden)
      current.pause();
    else if (current.playState === "paused") current.play();
  };

  const finish = (why: SwipeToastReason) => {
    setPhase("gone");
    leaving.current = false;
    if (latest.current.inline) {
      closeTimer.current = setTimeout(
        () => latest.current.onClose?.(why),
        COLLAPSE_MS,
      );
    } else latest.current.onClose?.(why);
  };

  const close = (why: SwipeToastReason) => {
    if (phaseRef.current !== "open" || leaving.current) return;
    if (drag.current) {
      pendingClose.current = why;
      return;
    }
    anim.current?.pause();
    const now =
      why === "escape" || (why === "action" && lastInput.current === "keyboard");
    setInstant(now);
    setPhase("closing");
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(
      () => finish(why),
      now ? 0 : latest.current.slideMs * EXIT + 60,
    );
  };

  const rescue = () => {
    clearTimeout(closeTimer.current);
    setInstant(false);
    y.set(0);
    fade.set(1);
    setPhase("open");
  };

  const closeRef = useRef(close);
  const rescueRef = useRef(rescue);
  closeRef.current = close;
  rescueRef.current = rescue;

  useEffect(() => {
    if (!open) closeRef.current("programmatic");
    else if (phaseRef.current !== "open") rescueRef.current();
  }, [open]);

  useEffect(() => {
    if (!HAS_STARTING_STYLE) requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (phase !== "open" || duration <= 0 || !fuseRef.current) return undefined;
    anim.current?.cancel();
    const burn = fuseRef.current.animate(BURN, {
      duration,
      easing: "linear",
      fill: "forwards",
    });
    burn.onfinish = () => closeRef.current("timeout");
    anim.current = burn;
    syncFuse();
    return () => {
      burn.onfinish = null;
      burn.pause();
    };
  }, [phase, duration]);

  useEffect(() => {
    if (!pauseOnHover) {
      flags.current.hover = false;
      syncFuse();
    }
  }, [pauseOnHover]);

  useEffect(() => {
    const onVisibility = () => {
      flags.current.hidden = document.hidden;
      syncFuse();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(closeTimer.current);
      anim.current?.cancel();
    };
  }, []);

  const swipeOut = (dy: number, velocity: number) => {
    anim.current?.pause();
    leaving.current = true;
    pendingClose.current = null;
    if (!reduce && cardRef.current) {
      animate(y, dy + cardRef.current.offsetHeight, {
        type: "spring",
        duration: 0.3,
        bounce: 0,
        velocity: velocity * 1000,
      });
    }
    void Promise.resolve(
      animate(fade, 0, { duration: 0.2, ease: EASE_OUT }),
    ).then(() => finish("swipe"));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    lastInput.current = "pointer";
    const target = event.target;
    if (
      event.button !== 0 ||
      !dismissible ||
      drag.current ||
      leaving.current ||
      (target instanceof Element && target.closest("button"))
    )
      return;
    if (phaseRef.current === "closing") rescue();
    try {
      cardRef.current?.setPointerCapture(event.pointerId);
    } catch {
      /* pointer already released */
    }
    y.stop();
    drag.current = {
      id: event.pointerId,
      startY: event.clientY,
      grab: null,
      moved: false,
      hist: [[performance.now(), y.get()]],
    };
    flags.current.interacting = true;
    syncFuse();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (current.grab === null) {
      if (Math.abs(event.clientY - current.startY) < DEAD_ZONE) return;
      current.grab = event.clientY - y.get();
      if (cardRef.current) cardRef.current.dataset.swiping = "";
    }
    const raw = event.clientY - current.grab;
    const next = raw >= 0 ? raw : rubberband(raw, RESIST_PX);
    y.set(next);
    current.moved = true;
    current.hist.push([performance.now(), next]);
    if (current.hist.length > 4) current.hist.shift();
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    if (cardRef.current) delete cardRef.current.dataset.swiping;
    try {
      cardRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      /* pointer already released */
    }
    flags.current.interacting = false;
    const dy = y.get();
    const velocity = velocityOf(current.hist);
    if (dy > 0 && (velocity > FLICK || (dy >= swipeDistance && velocity >= 0))) {
      swipeOut(dy, velocity);
      return;
    }
    if (current.moved) {
      animate(
        y,
        0,
        reduce
          ? { duration: 0.2, ease: EASE_OUT }
          : {
              type: "spring",
              duration: 0.5,
              bounce: settleBounce,
              velocity: velocity * 1000,
            },
      );
    }
    const queued = pendingClose.current;
    pendingClose.current = null;
    if (queued) close(queued);
    else syncFuse();
  };

  const tree = (
    <div
      className={`swipe-toast${className ? ` ${className}` : ""}`}
      data-phase={phase}
      data-inline={inline ? "true" : "false"}
      data-fuse={duration > 0 ? fuse : "none"}
      data-dismissible={dismissible ? "true" : "false"}
      data-placement={placement}
      data-instant={instant ? "" : undefined}
      data-mounted={mounted ? "true" : "false"}
      style={
        {
          "--st-bg": background,
          "--st-ink": color,
          "--st-fuse": fuseColor,
          "--st-w": `${width}px`,
          "--st-radius": `${radius}px`,
          "--st-slide": `${slideMs}ms`,
          "--st-gap": "10px",
          "--st-stack": `${stack}px`,
          "--st-layer": layer,
        } as CSSProperties
      }
    >
      <div className="swipe-toast__gate">
        <div className="swipe-toast__lift">
          <motion.div
            ref={cardRef}
            className="swipe-toast__card"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            tabIndex={0}
            style={{ transform, opacity: fade }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerEnter={(event) => {
              if (pauseOnHover && event.pointerType === "mouse") {
                flags.current.hover = true;
                syncFuse();
              }
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") {
                flags.current.hover = false;
                syncFuse();
              }
            }}
            onFocus={() => {
              flags.current.focus = true;
              syncFuse();
            }}
            onBlur={(event) => {
              const next = event.relatedTarget;
              if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
                flags.current.focus = false;
                syncFuse();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ")
                lastInput.current = "keyboard";
              if (event.key === "Escape" && dismissible) {
                event.stopPropagation();
                close("escape");
              }
            }}
          >
            <div className="swipe-toast__body">
              <div className="swipe-toast__title">{title}</div>
              {description ? (
                <div className="swipe-toast__desc">{description}</div>
              ) : null}
            </div>
            {actionLabel ? (
              <button
                type="button"
                className="swipe-toast__action"
                onClick={() => {
                  latest.current.onAction?.();
                  close("action");
                }}
              >
                {actionLabel}
              </button>
            ) : null}
            <div ref={fuseRef} className="swipe-toast__fuse" />
          </motion.div>
        </div>
      </div>
    </div>
  );

  if (inline || typeof document === "undefined") return tree;
  return createPortal(tree, document.body);
}
