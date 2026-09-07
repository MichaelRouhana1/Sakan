import { Skoun } from "@/constants/theme";

const FLASH_MS = 640;
const RING = `0 0 0 3px ${Skoun.color.primary}66`;
const RING_GONE = "0 0 0 3px rgba(47, 111, 237, 0)";
const MIST_GONE = "rgba(232, 238, 246, 0)";
const SCROLL_OPTS: AddEventListenerOptions = { passive: true };
const SHELL_ID = "skoun-web-shell";

let activeFlash: Animation | null = null;
let jumpGen = 0;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let failSafeTimer: ReturnType<typeof setTimeout> | undefined;
let pendingFinish: (() => void) | null = null;
let attachedScroller: HTMLElement | Window | null = null;

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function nearestScroller(el: HTMLElement): HTMLElement | Window {
  const named = document.getElementById(SHELL_ID);
  if (named) return named;
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body) {
    const oy = getComputedStyle(node).overflowY;
    if (
      (oy === "auto" || oy === "scroll") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return window;
}

function onScroll() {
  if (idleTimer != null) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => pendingFinish?.(), 90);
}

function onScrollEnd() {
  pendingFinish?.();
}

function detachScroll() {
  if (idleTimer != null) clearTimeout(idleTimer);
  if (failSafeTimer != null) clearTimeout(failSafeTimer);
  idleTimer = undefined;
  failSafeTimer = undefined;
  pendingFinish = null;
  const scroller = attachedScroller;
  attachedScroller = null;
  window.removeEventListener("scroll", onScroll, SCROLL_OPTS);
  document.body.removeEventListener("scroll", onScroll, SCROLL_OPTS);
  if (scroller && scroller !== window) {
    scroller.removeEventListener("scroll", onScroll, SCROLL_OPTS);
    scroller.removeEventListener("scrollend", onScrollEnd);
  }
  window.removeEventListener("scrollend", onScrollEnd);
  document.removeEventListener("scrollend", onScrollEnd);
  document.body.removeEventListener("scrollend", onScrollEnd);
}

function waitForScrollIdle(scroller: HTMLElement | Window): Promise<void> {
  pendingFinish?.();
  return new Promise((resolve) => {
    if (prefersReducedMotion()) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      detachScroll();
      resolve();
    };

    pendingFinish = finish;
    attachedScroller = scroller;
    scroller.addEventListener("scroll", onScroll, SCROLL_OPTS);
    window.addEventListener("scroll", onScroll, SCROLL_OPTS);
    document.body.addEventListener("scroll", onScroll, SCROLL_OPTS);
    scroller.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("scrollend", onScrollEnd);
    document.addEventListener("scrollend", onScrollEnd);
    document.body.addEventListener("scrollend", onScrollEnd);
    idleTimer = setTimeout(finish, 160);
    failSafeTimer = setTimeout(finish, 1600);
  });
}

function flashSection(el: HTMLElement) {
  activeFlash?.cancel();
  activeFlash = el.animate(
    [
      {
        backgroundColor: Skoun.color.primaryMist,
        boxShadow: RING,
      },
      {
        backgroundColor: Skoun.color.primaryMist,
        boxShadow: RING,
        offset: 0.38,
      },
      {
        backgroundColor: MIST_GONE,
        boxShadow: RING_GONE,
      },
    ],
    {
      duration: FLASH_MS,
      easing: "ease-out",
    },
  );
  void activeFlash.finished.catch(() => undefined).finally(() => {
    if (activeFlash?.playState === "finished") activeFlash = null;
  });
}

function scrollScrollerTo(
  scroller: HTMLElement | Window,
  el: HTMLElement,
): void {
  const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
  const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  if (scroller instanceof Window) {
    const top = el.getBoundingClientRect().top + window.scrollY - margin;
    window.scrollTo({ top: Math.max(0, top), behavior });
    return;
  }
  const top =
    el.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop -
    margin;
  scroller.scrollTo({ top: Math.max(0, top), behavior });
}

export function scrollToListingSection(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  const my = ++jumpGen;
  const scroller = nearestScroller(el);
  scrollScrollerTo(scroller, el);
  void waitForScrollIdle(scroller).then(() => {
    if (my !== jumpGen) return;
    const target = document.getElementById(id);
    if (target) flashSection(target);
  });
}
