import { WIZARD_STEPS } from "@/constants/listingWizard";

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

/** Extra assets swapped in-context on a wizard step (e.g. water on utilities). */
export type WizardLottieAssetId = WizardStepId | "water";

/** Native composition sizes — keep in sync when swapping Lottie assets. */
const LOTTIE_DIMS: Record<WizardLottieAssetId, { w: number; h: number }> = {
  type: { w: 1920, h: 1080 },
  location: { w: 1000, h: 1000 },
  specs: { w: 1620, h: 1435 },
  utilities: { w: 1080, h: 422 },
  water: { w: 500, h: 500 },
  rules: { w: 1500, h: 1500 },
  photos: { w: 500, h: 500 },
  pricing: { w: 720, h: 720 },
  copy: { w: 512, h: 512 },
  contact: { w: 1000, h: 1000 },
  review: { w: 2160, h: 2160 },
};

export function wizardLottieFrame(
  assetId: WizardLottieAssetId,
  viewportWidth: number,
  split: boolean,
): { width: number; height: number } {
  const { w, h } = LOTTIE_DIMS[assetId];
  const aspect = w / h;
  const maxW = split
    ? Math.min(viewportWidth * 0.44, 680)
    : Math.min(viewportWidth - 32, 340);
  const maxH = split ? 560 : 260;

  if (aspect >= 1.35) {
    const width = maxW;
    return { width, height: width / aspect };
  }

  if (aspect <= 0.85) {
    const height = maxH;
    return { width: height * aspect, height };
  }

  const side = Math.min(maxW, maxH, split ? 520 : 260);
  return { width: side, height: side / aspect };
}
