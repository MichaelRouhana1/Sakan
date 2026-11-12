import LottieView from "lottie-react-native";
import { useEffect, useState } from "react";
import { Image, View } from "react-native";
import { WIZARD_LOTTIE_MODULES } from "@/lib/wizardLottieSources";
import { tintWizardLottie } from "@/lib/wizardLottieTint";
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
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    const uri = Image.resolveAssetSource(WIZARD_LOTTIE_MODULES[assetId])?.uri;
    if (!uri) return;
    fetch(uri)
      .then((res) => res.json())
      .then((json: object) => {
        if (!cancelled) setData(tintWizardLottie(json, "madder", assetId));
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, pointerEvents: "none" }}
    >
      {data ? (
        <LottieView
          key={assetId}
          source={data}
          autoPlay={!reduce}
          loop={!reduce}
          progress={reduce ? 0.55 : undefined}
          style={{ width, height }}
        />
      ) : null}
    </View>
  );
}
