import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";

const ACTIVE_CLASS = "skoun-results-transition";

// Amber uses the browser's default 250ms ease transition between named cards.
// Keep the page chrome still while the individual card snapshots move/resize.
const TRANSITION_CSS = `
html.${ACTIVE_CLASS}::view-transition { pointer-events: none; }
html.${ACTIVE_CLASS}::view-transition-group(*) {
  animation-duration: 250ms;
  animation-timing-function: ease;
}
html.${ACTIVE_CLASS}::view-transition-old(root),
html.${ACTIVE_CLASS}::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
@media (prefers-reduced-motion: reduce) {
  html.${ACTIVE_CLASS}::view-transition-group(*),
  html.${ACTIVE_CLASS}::view-transition-old(*),
  html.${ACTIVE_CLASS}::view-transition-new(*) { animation-duration: 0s !important; }
}
`;

/** Run only explicit list/grid changes through a same-document view transition. */
export function useResultsLayoutTransition(reducedMotion: boolean) {
  const active = useRef<ViewTransition | null>(null);
  const revision = useRef(0);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = TRANSITION_CSS;
    document.head.appendChild(style);
    return () => {
      revision.current += 1;
      active.current?.skipTransition();
      active.current = null;
      document.documentElement.classList.remove(ACTIVE_CLASS);
      style.remove();
    };
  }, []);

  return useCallback((update: () => void) => {
    const request = ++revision.current;
    active.current?.skipTransition();
    active.current = null;

    if (
      typeof document === "undefined" ||
      typeof document.startViewTransition !== "function" ||
      reducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove(ACTIVE_CLASS);
      }
      update();
      return;
    }

    document.documentElement.classList.add(ACTIVE_CLASS);
    const transition = document.startViewTransition(() => {
      // A fast second click or unmount must supersede a pending capture.
      if (request === revision.current) flushSync(update);
    });
    active.current = transition;
    // Skipped/unsupported captures may reject ready; the update still completes.
    void transition.ready.catch(() => {});
    const finish = () => {
      if (active.current !== transition) return;
      active.current = null;
      document.documentElement.classList.remove(ACTIVE_CLASS);
    };
    void transition.finished.then(finish, finish);
  }, [reducedMotion]);
}
