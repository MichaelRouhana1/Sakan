import { gsap } from "gsap";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Studently } from "@/constants/theme";

type Props = {
  text: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
};

const SVG_NS = "http://www.w3.org/2000/svg";
const STROKE = "#EA3F4A";

type StrokeLine = {
  text: string;
  left: number;
  top: number;
  width: number;
};

function textNodeOf(el: HTMLElement): Text | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const node = walker.nextNode();
  return node && node.textContent ? (node as Text) : null;
}

function sameLines(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((line, i) => line === b[i]);
}

/** Where the browser breaks `el`, including a final campus name that wraps. */
function readLines(el: HTMLElement): string[] {
  const node = textNodeOf(el);
  const text = node?.textContent ?? "";
  if (!node || !text.trim()) return [];

  const range = document.createRange();
  const breaks = [0];
  let lastTop: number | null = null;
  for (let i = 0; i < text.length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const top = range.getBoundingClientRect().top;
    if (lastTop !== null && top > lastTop + 1) breaks.push(i);
    lastTop = top;
  }
  breaks.push(text.length);

  const lines: string[] = [];
  for (let i = 0; i < breaks.length - 1; i++) {
    let start = breaks[i]!;
    let end = breaks[i + 1]!;
    while (start < end && text[start] === " ") start++;
    while (end > start && text[end - 1] === " ") end--;
    if (start < end) lines.push(text.slice(start, end));
  }
  return lines;
}

function measureLines(root: HTMLElement): StrokeLine[] {
  const lines: StrokeLine[] = [];
  root.querySelectorAll<HTMLElement>("[data-line]").forEach((el) => {
    const node = textNodeOf(el);
    const text = node?.textContent ?? "";
    if (!node || !text) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    let top = box.top;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === " ") continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      top = range.getBoundingClientRect().top;
      break;
    }
    lines.push({ text, left: box.left, top, width: box.width });
  });
  return lines;
}

function mountStrokes(
  host: HTMLElement,
  lines: StrokeLine[],
  fontSize: number,
  family: string,
  letterSpacing: number,
): SVGTextElement[] {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(Math.max(host.clientWidth, 1)));
  svg.setAttribute("height", String(Math.max(host.clientHeight, 1)));
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.overflow = "visible";
  svg.style.pointerEvents = "none";

  const dash = Math.ceil(fontSize * 8);
  const strokeWidth = Math.max(1.35, fontSize * 0.028);
  const letters: SVGTextElement[] = [];
  const hostRect = host.getBoundingClientRect();

  for (const line of lines) {
    const run = document.createElementNS(SVG_NS, "text");
    run.setAttribute("x", String(line.left - hostRect.left));
    run.setAttribute("y", String(line.top - hostRect.top + fontSize * 0.8));
    run.setAttribute("fill", "none");
    run.setAttribute("xml:space", "preserve");
    run.style.fontFamily = family;
    run.style.fontWeight = "700";
    run.style.fontSize = `${fontSize}px`;
    run.style.letterSpacing = `${letterSpacing}px`;
    if (line.width > 0) {
      run.setAttribute("textLength", String(line.width));
      run.setAttribute("lengthAdjust", "spacing");
    }

    for (const ch of Array.from(line.text)) {
      const piece = document.createElementNS(SVG_NS, "tspan");
      piece.textContent = ch;
      if (ch !== " ") {
        piece.setAttribute("stroke", STROKE);
        piece.setAttribute("stroke-width", String(strokeWidth));
        piece.setAttribute("stroke-linejoin", "round");
        piece.setAttribute("stroke-linecap", "round");
        piece.style.strokeDasharray = String(dash);
        piece.style.strokeDashoffset = String(dash);
        letters.push(piece);
      }
      run.appendChild(piece);
    }
    svg.appendChild(run);
  }

  host.replaceChildren(svg);

  svg.querySelectorAll("text").forEach((run, index) => {
    const pieces = [...run.querySelectorAll("tspan")];
    pieces.forEach((piece) => {
      piece.style.strokeDashoffset = "0";
    });
    const ink = run.getBoundingClientRect();
    pieces.forEach((piece) => {
      if (piece.style.strokeDasharray) piece.style.strokeDashoffset = String(dash);
    });
    const line = lines[index];
    if (!line || ink.width < 1) return;
    run.setAttribute("x", String(Number(run.getAttribute("x")) + (line.left - ink.left)));
    run.setAttribute("y", String(Number(run.getAttribute("y")) + (line.top - ink.top)));
  });

  return letters;
}

function fontReady(family: string, fontSize: number) {
  if (!document.fonts) return true;
  const sizes = [`700 ${fontSize}px ${family}`, `400 ${fontSize}px ${family}`];
  return sizes.some((spec) => document.fonts.check(spec));
}

/**
 * Campus hero headline. Line breaks are fixed before the first stroke,
 * then the outlines draw and the letters fill with ink.
 */
export function StrokeHeadline({
  text,
  fontSize,
  lineHeight,
  letterSpacing,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const playedRef = useRef<string | null>(null);
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const playKey = `${text}|${fontSize}|${lineHeight}|${letterSpacing}`;
  const [locked, setLocked] = useState<{
    key: string;
    lines: string[];
    height: number;
  } | null>(null);
  const lines = locked?.key === playKey ? locked.lines : null;

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const family = Studently.type.display;
  const color = Studently.color.ink;

  useLayoutEffect(() => {
    if (reduced) return;
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let timeline: gsap.core.Timeline | null = null;
    let settle = 0;
    let lastSignature = "";
    let lastWidth = -1;

    const showFinal = () => {
      linesRef.current?.querySelectorAll<HTMLElement>("[data-line]").forEach((el) => {
        el.style.clipPath = "none";
      });
      svgRef.current?.replaceChildren();
    };

    const play = () => {
      const svgHost = svgRef.current;
      const root = linesRef.current;
      if (cancelled || !svgHost || !root) return;
      if (playedRef.current === playKey) {
        showFinal();
        return;
      }
      const strokeLines = measureLines(root);
      const fills = Array.from(root.querySelectorAll<HTMLElement>("[data-line]"));
      if (!strokeLines.length || !fills.length) return;

      gsap.killTweensOf(fills);
      gsap.set(fills, { clipPath: "inset(0% 100% 0% 0%)" });
      const letters = mountStrokes(svgHost, strokeLines, fontSize, family, letterSpacing);
      if (!letters.length) return;

      const count = letters.length;
      const stagger = Math.min(0.085, 2.4 / count);
      const drawDuration = 2.35;
      const total = drawDuration + stagger * (count - 1);
      const fillStart = total * 0.52;
      const fillDuration = Math.max(1.15, total * 0.38);

      timeline = gsap.timeline({
        onComplete: () => {
          playedRef.current = playKey;
          showFinal();
        },
      });
      timeline.to(
        letters,
        {
          strokeDashoffset: 0,
          duration: drawDuration,
          ease: "power2.out",
          stagger,
        },
        0,
      );
      timeline.to(
        fills,
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: fillDuration,
          ease: "power2.inOut",
        },
        fillStart,
      );
      timeline.to(
        letters,
        { strokeOpacity: 0, duration: 0.4, ease: "power1.out" },
        fillStart + fillDuration * 0.55,
      );
    };

    const commit = () => {
      if (cancelled || host.clientWidth < 8) return;
      if (!fontReady(family, fontSize)) return;
      const source = measureRef.current ?? linesRef.current;
      if (!source) return;
      const next = readLines(measureRef.current ? measureRef.current : source);
      if (!next.length) return;
      const signature = next.join("\n");
      const width = host.clientWidth;
      if (signature === lastSignature && width === lastWidth) settle += 1;
      else {
        settle = 0;
        lastSignature = signature;
        lastWidth = width;
      }
      // Two identical measures: the wrap has stopped moving.
      if (settle < 1) return;
      const height = measureRef.current?.offsetHeight ?? next.length * lineHeight;
      setLocked((prev) =>
        prev && prev.key === playKey && sameLines(prev.lines, next)
          ? prev
          : { key: playKey, lines: next, height },
      );
    };

    if (lines) {
      if (playedRef.current !== playKey) {
        linesRef.current?.querySelectorAll<HTMLElement>("[data-line]").forEach((el) => {
          el.style.clipPath = "inset(0% 100% 0% 0%)";
        });
      }
      play();
      return () => {
        cancelled = true;
        timeline?.kill();
      };
    }

    let looping = false;
    const poke = () => {
      if (cancelled || looping) return;
      looping = true;
      const step = () => {
        if (cancelled) {
          looping = false;
          return;
        }
        commit();
        if (settle < 1) requestAnimationFrame(step);
        else looping = false;
      };
      requestAnimationFrame(step);
    };

    if (fontReady(family, fontSize)) poke();
    else {
      const onFonts = () => {
        if (fontReady(family, fontSize)) poke();
      };
      document.fonts?.addEventListener("loadingdone", onFonts);
      document.fonts?.load(`700 ${fontSize}px ${family}`).then(onFonts).catch(() => {});
      document.fonts?.ready.then(onFonts);
      const fallback = window.setTimeout(poke, 1600);
      const observer = new ResizeObserver(poke);
      observer.observe(host);
      return () => {
        cancelled = true;
        window.clearTimeout(fallback);
        observer.disconnect();
        document.fonts?.removeEventListener("loadingdone", onFonts);
      };
    }

    const observer = new ResizeObserver(poke);
    observer.observe(host);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [family, fontSize, letterSpacing, lineHeight, lines, playKey, reduced]);

  const type: CSSProperties = {
    color,
    fontFamily: family,
    fontWeight: 700,
    fontSize,
    lineHeight: `${lineHeight}px`,
    letterSpacing,
    backgroundColor: "transparent",
  };

  return (
    <div ref={hostRef} role="heading" aria-level={1} aria-label={text} style={styles.host}>
      {reduced || !lines ? (
        <span
          ref={measureRef}
          aria-hidden={reduced ? undefined : true}
          style={{
            ...type,
            display: "block",
            visibility: reduced ? "visible" : "hidden",
          }}
        >
          {text}
        </span>
      ) : (
        <div ref={linesRef} style={{ height: locked?.key === playKey ? locked.height : undefined }}>
          {lines.map((line, index) => (
            <div key={`${index}-${line}`} style={{ height: lineHeight, lineHeight: `${lineHeight}px` }}>
              <span data-line="" style={{ ...type, display: "inline-block", whiteSpace: "nowrap" }}>
                {line}
              </span>
            </div>
          ))}
        </div>
      )}
      {reduced ? null : <div ref={svgRef} aria-hidden style={styles.stroke} />}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  host: {
    position: "relative",
    width: "100%",
    alignSelf: "stretch",
    pointerEvents: "auto",
  },
  stroke: {
    position: "absolute",
    inset: 0,
    overflow: "visible",
    pointerEvents: "none",
  },
};
