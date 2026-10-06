import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "../constants/webLayout";
// Production surfaces and the crop preview share these sizing rules.
export const SEARCH_PHOTO_ASPECT = 16 / 10;
export const NATIVE_CARD_PHOTO_WIDTH = 118;
export const NATIVE_CARD_PHOTO_MIN_HEIGHT = 168;
export const DETAIL_MOBILE_BREAKPOINT = 900;
export const DETAIL_SIDE_WIDTH = 380;
export const DETAIL_COLUMN_GAP = 48;
export const DETAIL_HERO_HEIGHT = 400;
export const DETAIL_GALLERY_GAP = 8;
export const DETAIL_THUMBS_WIDTH = 280;
export function cardPhotoHeight(width: number, minHeight = 0) {
  return Math.round(Math.max(width / SEARCH_PHOTO_ASPECT, minHeight));
}
export function mobileHeroHeight(height: number) {
  return Math.round(Math.min(Math.max(height * 0.44, 280), 420));
}
export function detailPhotoFrame(
  width: number,
  height: number,
  native: boolean,
  photoCount: number,
  contentWidth = width,
) {
  if (native || width < DETAIL_MOBILE_BREAKPOINT)
    return { width, height: mobileHeroHeight(height) };
  return {
    width: Math.max(
      1,
      Math.min(contentWidth, WEB_CONTENT_MAX) -
        WEB_CONTENT_PAD_X * 2 -
        DETAIL_SIDE_WIDTH -
        DETAIL_COLUMN_GAP -
        (photoCount > 1 ? DETAIL_THUMBS_WIDTH + DETAIL_GALLERY_GAP : 0),
    ),
    height: DETAIL_HERO_HEIGHT,
  };
}
