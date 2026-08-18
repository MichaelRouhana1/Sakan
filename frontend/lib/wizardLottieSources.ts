import type { WizardLottieAssetId } from "@/lib/wizardLottieFrame";

/** Metro asset modules — keep JSON in assetExts so SSR does not inline ~1.7MB. */
export const WIZARD_LOTTIE_MODULES: Record<WizardLottieAssetId, number> = {
  type: require("../assets/lottie/wizard/type.json"),
  location: require("../assets/lottie/wizard/location.json"),
  specs: require("../assets/lottie/wizard/specs.json"),
  utilities: require("../assets/lottie/wizard/utilities.json"),
  water: require("../assets/lottie/wizard/water.json"),
  rules: require("../assets/lottie/wizard/rules.json"),
  photos: require("../assets/lottie/wizard/photos.json"),
  pricing: require("../assets/lottie/wizard/pricing.json"),
  copy: require("../assets/lottie/wizard/copy.json"),
  contact: require("../assets/lottie/wizard/contact.json"),
  review: require("../assets/lottie/wizard/review.json"),
};
