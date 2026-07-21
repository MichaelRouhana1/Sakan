import * as ImageManipulator from "expo-image-manipulator";
import { api } from "@/lib/api";

const MAX_EDGE = 1600;
const COMPRESS_QUALITY = 0.72;

export type LocalPhotoAsset = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

/** Compress client-side before upload (PRD). */
export async function compressListingPhoto(
  uri: string,
): Promise<{ uri: string; mimeType: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_EDGE } }],
    {
      compress: COMPRESS_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  return { uri: result.uri, mimeType: "image/jpeg" };
}

type UploadResponse = {
  data: {
    urls: string[];
    photos: { url: string; sortOrder: number }[];
  };
};

/** Upload one or more compressed images; returns public URLs in order. */
export async function uploadListingPhotos(
  assets: LocalPhotoAsset[],
): Promise<string[]> {
  if (assets.length === 0) return [];

  const form = new FormData();
  for (const [index, asset] of assets.entries()) {
    const name = asset.fileName?.replace(/\.[^.]+$/, "") ?? `photo-${index}`;
    form.append("photos", {
      uri: asset.uri,
      name: `${name}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
    } as unknown as Blob);
  }

  const { data } = await api.post<UploadResponse>(
    "/api/listings/photos",
    form,
    {
      // Override JSON default so RN can set multipart boundary
      headers: { "Content-Type": "multipart/form-data" },
      transformRequest: (body) => body as FormData,
      timeout: 60_000,
    },
  );

  return data.data.urls;
}
