import lottie, { type AnimationItem } from "lottie-web";
import { createElement, useEffect, useRef } from "react";
import { View } from "react-native";
import contact from "@/assets/lottie/wizard/contact.json";
import copy from "@/assets/lottie/wizard/copy.json";
import location from "@/assets/lottie/wizard/location.json";
import photos from "@/assets/lottie/wizard/photos.json";
import pricing from "@/assets/lottie/wizard/pricing.json";
import review from "@/assets/lottie/wizard/review.json";
import rules from "@/assets/lottie/wizard/rules.json";
import specs from "@/assets/lottie/wizard/specs.json";
import typeAnim from "@/assets/lottie/wizard/type.json";
import utilities from "@/assets/lottie/wizard/utilities.json";
import water from "@/assets/lottie/wizard/water.json";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { WizardLottieAssetId } from "@/lib/wizardLottieFrame";

export type { WizardStepId } from "@/lib/wizardLottieFrame";

const SOURCES: Record<WizardLottieAssetId, object> = {
  type: typeAnim,
  location,
  specs,
  utilities,
  water,
  rules,
  photos,
  pricing,
  copy,
  contact,
  review,
};

type Props = {
  assetId: WizardLottieAssetId;
  width: number;
  height: number;
};

export function WizardLottie({ assetId, width, height }: Props) {
  const reduce = useReducedMotion();
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.replaceChildren();
    let anim: AnimationItem | null = null;
    try {
      anim = lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: !reduce,
        autoplay: !reduce,
        animationData: SOURCES[assetId],
        rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
      });
      if (reduce) {
        anim.goToAndStop(Math.floor(anim.totalFrames * 0.55), true);
      }
    } catch {
      el.replaceChildren();
    }
    return () => {
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
