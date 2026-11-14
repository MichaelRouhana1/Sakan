import type { WizardLottieAssetId } from "@/lib/wizardLottieFrame";

/** Original authored animation data shared by the web and native players. */
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
