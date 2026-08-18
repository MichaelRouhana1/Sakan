import LottieView, { type AnimationObject } from "lottie-react-native";
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

const SOURCES: Record<WizardLottieAssetId, AnimationObject> = {
  type: typeAnim as AnimationObject,
  location: location as AnimationObject,
  specs: specs as AnimationObject,
  utilities: utilities as AnimationObject,
  water: water as AnimationObject,
  rules: rules as AnimationObject,
  photos: photos as AnimationObject,
  pricing: pricing as AnimationObject,
  copy: copy as AnimationObject,
  contact: contact as AnimationObject,
  review: review as AnimationObject,
};

type Props = {
  assetId: WizardLottieAssetId;
  width: number;
  height: number;
};

export function WizardLottie({ assetId, width, height }: Props) {
  const reduce = useReducedMotion();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width, height }}
    >
      <LottieView
        key={assetId}
        source={SOURCES[assetId]}
        autoPlay={!reduce}
        loop={!reduce}
        progress={reduce ? 0.55 : undefined}
        style={{ width, height }}
      />
    </View>
  );
}
