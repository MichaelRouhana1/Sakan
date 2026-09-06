import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

const CELL = 56;

type Cell = { row: number; col: number };

/**
 * Aceternity-style background cells: a click starts an opacity ripple
 * that travels outward by Euclidean distance. Raw DOM so RN Web className
 * and CSS animation-delay work. Static under prefers-reduced-motion.
 */
export function HeroRipple() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [clicked, setClicked] = useState<Cell | null>(null);
  const [wave, setWave] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const r = host.getBoundingClientRect();
      setSize({ w: Math.ceil(r.width), h: Math.ceil(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const cols = Math.max(1, Math.ceil(size.w / CELL) + 2);
  const rows = Math.max(1, Math.ceil(size.h / CELL) + 1);
  const cells = useMemo(
    () => Array.from({ length: rows * cols }, (_, i) => i),
    [rows, cols],
  );

  const onCellClick = (row: number, col: number) => {
    if (reduced) return;
    setClicked({ row, col });
    setWave((n) => n + 1);
  };

  return (
    <div ref={hostRef} className="campus-ripple" aria-hidden>
      {size.w > 0 ? (
        <div
          key={wave}
          className="campus-ripple-grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
            gridTemplateRows: `repeat(${rows}, ${CELL}px)`,
            width: cols * CELL,
            height: rows * CELL,
          }}
        >
          {cells.map((idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const distance = clicked
              ? Math.hypot(clicked.row - row, clicked.col - col)
              : 0;
            const style =
              clicked && !reduced
                ? ({
                    ["--delay"]: `${Math.max(0, distance * 55)}ms`,
                    ["--duration"]: `${200 + distance * 80}ms`,
                  } as CSSProperties)
                : undefined;
            return (
              <div
                key={idx}
                className={
                  clicked && !reduced
                    ? "campus-ripple-cell is-rippling"
                    : "campus-ripple-cell"
                }
                style={style}
                onClick={() => onCellClick(row, col)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
