export const PHOTO_CAPTION_LIMIT = 48;
export function normalizePhotoCaption(value?: string | null) {
  return (value ?? "").trim().slice(0, PHOTO_CAPTION_LIMIT);
}
