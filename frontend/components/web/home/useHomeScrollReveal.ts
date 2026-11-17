import { useEffect, type RefObject } from "react";
import { Platform, type ScrollView } from "react-native";

// Keep in sync with the homepage's 900px desktop layout breakpoint.
const HOME_DESKTOP_MIN_WIDTH = 900;

type RevealKind = "up" | "card" | "photo" | "fade" | "soft";

// Matches Amber's desktop HomeV2 reveal distances, durations, and easing.
const MOTION: Record<RevealKind, { duration: number; translate: string; scale: string }> = {
  up: { duration: 800, translate: "0 20px", scale: "1" },
  card: { duration: 900, translate: "0 32px", scale: "0.97" },
  photo: { duration: 1200, translate: "0", scale: "1.04" },
  fade: { duration: 500, translate: "0 6px", scale: "1" },
  soft: { duration: 600, translate: "0 10px", scale: "1" },
};

export function homeRevealProps(kind: RevealKind, step = 70, rail?: string): object {
  return Platform.OS === "web"
    ? { dataSet: { homeReveal: kind, homeRevealStep: String(step), ...(rail ? { homeRevealRail: rail } : {}) } }
    : {};
}

/** First-visit entrances, adapted to our nested scroll view and desktop breakpoint. */
export function useHomeScrollReveal(scrollRef: RefObject<ScrollView | null>) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const root = scrollRef.current?.getScrollableNode() as HTMLElement | undefined;
    if (!root || !window.IntersectionObserver || !root.animate) return;

    const media = window.matchMedia(
      `(min-width: ${HOME_DESKTOP_MIN_WIDTH}px) and (prefers-reduced-motion: no-preference)`,
    );
    const revealed = new WeakSet<HTMLElement>();
    const animations = new Map<HTMLElement, Animation>();
    const waiting = new Set<HTMLElement>();
    let observer: IntersectionObserver | undefined;
    let mutations: MutationObserver | undefined;
    let frame = 0;

    const finish = (element: HTMLElement) => {
      revealed.add(element);
      waiting.delete(element);
      observer?.unobserve(element);
      animations.get(element)?.cancel();
      animations.delete(element);
    };

    const reset = () => {
      observer?.disconnect();
      mutations?.disconnect();
      window.cancelAnimationFrame(frame);
      frame = 0;
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      waiting.clear();
    };

    const setup = () => {
      reset();
      if (!media.matches) return;

      observer = new IntersectionObserver((entries) => {
        const visible = entries.filter(entry => entry.isIntersecting && waiting.has(entry.target as HTMLElement));
        const batch = new Set(visible.map(entry => entry.target));
        const viewport = root.getBoundingClientRect();
        const ordered = visible.sort((a, b) => Math.abs(a.boundingClientRect.top - b.boundingClientRect.top) > 24
          ? a.boundingClientRect.top - b.boundingClientRect.top
          : a.boundingClientRect.left - b.boundingClientRect.left);
        let delay = 0;
        ordered.forEach(({ target, boundingClientRect: bounds }) => {
          const element = target as HTMLElement;
          if (bounds.bottom <= viewport.top) {
            finish(element);
          } else {
            observer?.unobserve(element);
            waiting.delete(element);
            revealed.add(element);
            const animation = animations.get(element);
            animation?.effect?.updateTiming({ delay: Math.min(delay, 640) });
            if (animation) {
              animation.onfinish = () => finish(element);
              animation.play();
            }
            delay += Number(element.dataset.homeRevealStep ?? 70);
          }
          // Offscreen siblings in this row stay visible when the rail scrolls sideways.
          const rail = element.dataset.homeRevealRail;
          if (rail) waiting.forEach(sibling => {
            if (sibling.dataset.homeRevealRail === rail && !batch.has(sibling)
              && Math.abs(sibling.getBoundingClientRect().top - bounds.top) <= 24) finish(sibling);
          });
        });
      }, { root, rootMargin: "100000px 0px 0px 0px", threshold: 0 });

      const scan = () => {
        const bottom = root.getBoundingClientRect().bottom;
        root.querySelectorAll<HTMLElement>("[data-home-reveal]").forEach(element => {
          if (revealed.has(element) || animations.has(element)) return;
          // Initial/restored content and newly loaded content already in view stay visible.
          if (element.getBoundingClientRect().top < bottom) {
            revealed.add(element);
            return;
          }
          const motion = MOTION[element.dataset.homeReveal as RevealKind];
          if (!motion) return;
          const animation = element.animate([
            { opacity: 0, translate: motion.translate, scale: motion.scale },
            { opacity: 1, translate: "0", scale: "1" },
          ], { duration: motion.duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" });
          animation.pause();
          animation.currentTime = 0;
          animations.set(element, animation);
          waiting.add(element);
          observer?.observe(element);
        });
      };

      scan();
      mutations = new MutationObserver(() => {
        if (!frame) frame = window.requestAnimationFrame(() => { frame = 0; scan(); });
      });
      mutations.observe(root, { childList: true, subtree: true });
    };

    // Focused controls must be visible immediately, including during a stagger delay.
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>("[data-home-reveal]");
      if (element) finish(element);
    };

    setup();
    media.addEventListener("change", setup);
    root.addEventListener("focusin", onFocus);
    return () => {
      reset();
      media.removeEventListener("change", setup);
      root.removeEventListener("focusin", onFocus);
    };
  }, [scrollRef]);
}
