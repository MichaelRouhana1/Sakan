export const PHOTO_CROP_ASPECT = 16 / 10;
export type CropRect = { x: number; y: number; width: number; height: number };
export type PhotoSource = { uri: string; name: string; owned?: boolean };
export type DecodedPhoto = PhotoSource & { width: number; height: number };
export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export function cropFromPosition(
  width: number,
  height: number,
  zoom = 1,
  x = 0.5,
  y = 0.5,
): CropRect {
  const w = Math.min(width, height * PHOTO_CROP_ASPECT) / clamp(zoom, 1, 4);
  const h = w / PHOTO_CROP_ASPECT;
  return {
    x: (width - w) * clamp(x, 0, 1),
    y: (height - h) * clamp(y, 0, 1),
    width: w,
    height: h,
  };
}
// Use integer source pixels for both preview and export, never two independent crops.
export function boundedCrop(
  rect: CropRect,
  width: number,
  height: number,
): CropRect {
  const w = clamp(Math.round(rect.width), 1, width);
  const h = clamp(Math.round(rect.height), 1, height);
  return {
    x: clamp(Math.round(rect.x), 0, width - w),
    y: clamp(Math.round(rect.y), 0, height - h),
    width: w,
    height: h,
  };
}
export function cropImagePlacement(
  source: { width: number; height: number },
  crop: CropRect,
  frame: { width: number; height: number },
) {
  const scale = Math.max(frame.width / crop.width, frame.height / crop.height);
  return {
    width: source.width * scale,
    height: source.height * scale,
    left: (frame.width - crop.width * scale) / 2 - crop.x * scale,
    top: (frame.height - crop.height * scale) / 2 - crop.y * scale,
  };
}
