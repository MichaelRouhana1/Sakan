import lottie, { type AnimationItem } from "lottie-web";
import { createElement, useEffect, useRef } from "react";
import { Image, View } from "react-native";
import { WIZARD_LOTTIE_MODULES } from "@/lib/wizardLottieSources";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { WizardLottieAssetId } from "@/lib/wizardLottieFrame";

export type { WizardStepId } from "@/lib/wizardLottieFrame";

type Props = {
  assetId: WizardLottieAssetId;
  width: number;
  height: number;
};

const dataCache = new Map<WizardLottieAssetId, Promise<object>>();

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
  return (
    !!mod &&
    typeof mod === "object" &&
    "layers" in mod &&
    "v" in mod
  );
}

function loadAnimationData(id: WizardLottieAssetId): Promise<object> {
  const hit = dataCache.get(id);
  if (hit) return hit;

  const pending = (async () => {
    const mod: unknown = WIZARD_LOTTIE_MODULES[id];
    if (isLottieData(mod)) return mod;
    const uri = moduleUri(mod);
    if (!uri) {
      throw new Error(`Missing Lottie asset URI for ${id}`);
    }
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error(`Lottie fetch failed (${res.status}) for ${id}`);
    }
    return (await res.json()) as object;
  })();

  dataCache.set(id, pending);
  return pending;
}

export function WizardLottie({ assetId, width, height }: Props) {
  const reduce = useReducedMotion();
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    let anim: AnimationItem | null = null;

    loadAnimationData(assetId)
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
        dataCache.delete(assetId);
      });

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, [assetId, reduce]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        alignSelf: "center",
        pointerEvents: "none",
      }}
    >
      {createElement("div", {
        ref: host,
        style: { width, height },
      })}
    </View>
  );
}
