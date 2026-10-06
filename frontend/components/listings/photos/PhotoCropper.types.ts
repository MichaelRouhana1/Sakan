import type { CropRect, DecodedPhoto } from "@/lib/photoCropGeometry";
export type CropperProps = {
  source: DecodedPhoto;
  onCrop: (crop: CropRect) => void;
  disabled: boolean;
};
