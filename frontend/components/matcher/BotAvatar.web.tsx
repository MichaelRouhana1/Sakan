import lottie, { type AnimationItem } from "lottie-web";
import { createElement, useEffect, useRef, useState } from "react";
import { Image, View } from "react-native";

const BOT_LOTTIE: unknown = require("../../assets/lottie/find-place-bot.json");

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

function holdStill(anim: AnimationItem) {
  const frame = Math.floor((anim.totalFrames || 1) * 0.55);
  anim.goToAndStop(frame, true);
}

export function BotAvatar({
  playing = false,
  playOnHover = false,
  size = 32,
}: {
  playing?: boolean;
  playOnHover?: boolean;
  size?: number;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [hovered, setHovered] = useState(false);
  const active = playOnHover ? hovered : playing;
  const playingRef = useRef(active);
  playingRef.current = active;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    loadBotAnimation()
      .then((animationData) => {
        if (cancelled || !host.current) return;
        el.replaceChildren();
        try {
          const anim = lottie.loadAnimation({
            container: el,
            renderer: "svg",
            loop: true,
            autoplay: false,
            animationData,
            rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
          });
          animRef.current = anim;
          const start = () => {
            if (reduce || !playingRef.current) holdStill(anim);
            else anim.play();
          };
          if (anim.isLoaded) start();
          else anim.addEventListener("DOMLoaded", start);
        } catch {
          el.replaceChildren();
        }
      })
      .catch(() => {
        animationDataPromise = null;
      });

    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!playOnHover) return;
    const el = host.current;
    if (!el) return;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [playOnHover]);

  useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shouldPlay = playOnHover ? hovered : playing;
    if (reduce || !shouldPlay) {
      if (playOnHover && !reduce) anim.pause();
      else holdStill(anim);
    } else anim.play();
  }, [playing, hovered, playOnHover]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents={playOnHover ? "box-none" : "none"}
      onPointerEnter={() => {
        if (playOnHover) setHovered(true);
      }}
      onPointerLeave={() => {
        if (playOnHover) setHovered(false);
      }}
      style={{ width: size, height: size }}
    >
      {createElement("div", {
        ref: host,
        style: {
          width: size,
          height: size,
          filter: "drop-shadow(0 3px 4px rgba(18, 24, 38, 0.35))",
        },
      })}
    </View>
  );
}
