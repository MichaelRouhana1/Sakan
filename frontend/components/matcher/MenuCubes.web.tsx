import { useEffect, useMemo, useRef, useState } from "react";

const CELL = 56;

/** Static campus-hero cell grid. No hover and no click ripple. */
export function MenuCubes() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

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

  const cols = Math.max(1, Math.ceil(size.w / CELL) + 1);
  const rows = Math.max(1, Math.ceil(size.h / CELL) + 1);
  const cells = useMemo(
    () => Array.from({ length: rows * cols }, (_, i) => i),
    [rows, cols],
  );

  return (
    <div ref={hostRef} className="matcher-cubes" aria-hidden>
      <style>{`
        .matcher-cubes {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
          user-select: none;
          -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 46%, transparent 60%);
          mask-image: linear-gradient(to bottom, #000 0%, #000 46%, transparent 60%);
        }
        .matcher-cubes-grid {
          display: grid;
          margin-inline: auto;
        }
        .matcher-cubes-cell {
          box-sizing: border-box;
          border: 0.5px solid #D5DCE7;
          background: rgba(47, 111, 237, 0.1);
          opacity: 0.4;
          pointer-events: none;
        }
      `}</style>
      {size.w > 0 ? (
        <div
          className="matcher-cubes-grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
            gridTemplateRows: `repeat(${rows}, ${CELL}px)`,
            width: cols * CELL,
            height: rows * CELL,
          }}
        >
          {cells.map((idx) => (
            <div key={idx} className="matcher-cubes-cell" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
