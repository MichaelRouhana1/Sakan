import LottieView from "lottie-react-native";
import { View } from "react-native";
import { WIZARD_LOTTIE_MODULES } from "@/lib/wizardLottieSources";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { WizardLottieAssetId } from "@/lib/wizardLottieFrame";

export type { WizardStepId } from "@/lib/wizardLottieFrame";

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
        source={WIZARD_LOTTIE_MODULES[assetId]}
        autoPlay={!reduce}
        loop={!reduce}
        progress={reduce ? 0.55 : undefined}
        style={{ width, height }}
      />
    </View>
  );
}
