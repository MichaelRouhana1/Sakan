import lottie, { type AnimationItem } from "lottie-web";
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { Skoun } from "@/constants/theme";
import { skounShadow } from "@/lib/skounShadow";
import { useReducedMotion } from "@/lib/useReducedMotion";

const CIRCLE = 76;
const INTRO_MS = 6500;
const BOT_LOTTIE: unknown = require("../../assets/lottie/find-place-bot.json");

const LABEL = "Need help finding a place?";

let animationDataPromise: Promise<object> | null = null;

function moduleUri(mod: unknown): string | null {
  if (typeof mod === "string" && mod.length > 0) return mod;
  if (mod && typeof mod === "object" && "uri" in mod) {
    const uri = (mod as { uri: unknown }).uri;
    if (typeof uri === "string" && uri.length > 0) return uri;
  }
  if (typeof mod === "number") {
    return Image.resolveAssetSource(mod)?.uri ?? null;
  }
  return null;
}

function isLottieData(mod: unknown): mod is object {
  return !!mod && typeof mod === "object" && "layers" in mod && "v" in mod;
}

function loadBotAnimation(): Promise<object> {
  if (animationDataPromise) return animationDataPromise;
  animationDataPromise = (async () => {
    if (isLottieData(BOT_LOTTIE)) return BOT_LOTTIE;
    const uri = moduleUri(BOT_LOTTIE);
    if (!uri) throw new Error("Missing find-place bot Lottie");
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`Lottie fetch failed (${res.status})`);
    return (await res.json()) as object;
  })();
  return animationDataPromise;
}

function BotLottie({ size, reduce }: { size: number; reduce: boolean }) {
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    let anim: AnimationItem | null = null;

    loadBotAnimation()
      .then((animationData) => {
        if (cancelled || !host.current) return;
        el.replaceChildren();
        try {
          anim = lottie.loadAnimation({
            container: el,
            renderer: "svg",
            loop: !reduce,
            autoplay: !reduce,
            animationData,
            rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
          });
          if (reduce) {
            anim.goToAndStop(Math.floor(anim.totalFrames * 0.55), true);
          }
        } catch {
          el.replaceChildren();
        }
      })
      .catch(() => {
        animationDataPromise = null;
      });

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, [reduce]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width: size, height: size }}
    >
      {createElement("div", {
        ref: host,
        style: { width: size, height: size },
      })}
    </View>
  );
}

function FabBody({
  onPress,
  hidden,
}: {
  onPress: () => void;
  hidden: boolean;
}) {
  const reduce = useReducedMotion();
  const { width } = useWindowDimensions();
  const [intro, setIntro] = useState(true);
  const [primed, setPrimed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setPrimed(true);
    const timer = setTimeout(() => setIntro(false), INTRO_MS);
    return () => clearTimeout(timer);
  }, []);

  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;
  const open = primed && (intro || hovered || focused);
  const bubbleMax = Math.min(280, Math.max(160, width - CIRCLE - 72));

  const bindBubble = useCallback((node: HTMLDivElement | null) => {
    bubbleRef.current = node;
    if (!node || node.dataset.bound === "1") return;
    node.dataset.bound = "1";
    node.style.opacity = "0";
    node.style.transform = "translate(8px, -50%) scale(0.92)";
    node.style.pointerEvents = "none";
    node.style.transition = reduceRef.current
      ? "none"
      : "opacity 280ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)";
  }, []);

  useEffect(() => {
    const el = bubbleRef.current;
    if (!el) return;
    el.style.opacity = open ? "1" : "0";
    el.style.transform = open
      ? "translateY(-50%) scale(1)"
      : "translate(8px, -50%) scale(0.92)";
    el.style.pointerEvents = open && !hidden ? "auto" : "none";
  }, [open, hidden]);

  useEffect(() => {
    if (!hidden) return;
    const host = bubbleRef.current?.parentElement;
    if (host instanceof HTMLElement && document.activeElement === host) {
      host.blur();
    }
  }, [hidden]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={LABEL}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      focusable={!hidden}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.anchor, hidden && styles.anchorHidden]}
    >
      {createElement(
        "div",
        {
          ref: bindBubble,
          "aria-hidden": true,
          style: {
            position: "absolute",
            right: CIRCLE + 12,
            top: "50%",
            left: "auto",
            width: "max-content",
            maxWidth: bubbleMax,
            boxSizing: "border-box",
            whiteSpace: "nowrap",
            transformOrigin: "right center",
            backgroundColor: Skoun.color.surface,
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            padding: "10px 14px",
            boxShadow: "0px 6px 16px rgba(18, 24, 38, 0.12)",
            color: Skoun.color.ink,
            fontFamily: Skoun.type.bodySemi,
            fontSize: 14,
            lineHeight: "20px",
          },
        },
        LABEL,
        createElement("span", {
          "aria-hidden": true,
          style: {
            position: "absolute",
            right: -6,
            top: "50%",
            width: 12,
            height: 12,
            marginTop: -6,
            backgroundColor: Skoun.color.surface,
            borderTop: "1px solid #E2E8F0",
            borderRight: "1px solid #E2E8F0",
            transform: "rotate(45deg)",
          },
        }),
      )}
      <View style={[styles.circle, focused && styles.circleFocused]}>
        <BotLottie size={CIRCLE} reduce={reduce} />
      </View>
    </Pressable>
  );
}

export function FindMyPlaceFab({
  onPress,
  hidden = false,
}: {
  onPress: () => void;
  hidden?: boolean;
}) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  if (!portalRoot) return null;
  return createPortal(
    <FabBody onPress={onPress} hidden={hidden} />,
    portalRoot,
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "fixed" as unknown as "absolute",
    right: 24,
    bottom: 24,
    zIndex: 60,
    width: CIRCLE,
    height: CIRCLE,
    cursor: "pointer",
  } as ViewStyle,
  anchorHidden: {
    opacity: 0,
    pointerEvents: "none",
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: "#2F6FED",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    ...skounShadow({ blur: 18, y: 6, opacity: 0.16, elevation: 4 }),
  },
  circleFocused: {
    borderColor: Skoun.color.primary,
    borderWidth: 2,
  },
});
