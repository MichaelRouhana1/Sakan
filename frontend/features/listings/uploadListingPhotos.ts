import type { AxiosRequestHeaders } from "axios";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";
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

function stripMultipartContentType(headers: AxiosRequestHeaders) {
  if (typeof headers.delete === "function") {
    headers.delete("Content-Type");
    return;
  }
  delete (headers as Record<string, string>)["Content-Type"];
}

async function appendPhoto(
  form: FormData,
  asset: LocalPhotoAsset,
  index: number,
): Promise<void> {
  const baseName =
    asset.fileName?.replace(/\.[^.]+$/, "") ?? `photo-${index}`;
  const filename = `${baseName}.jpg`;
  const mimeType = asset.mimeType ?? "image/jpeg";

  if (Platform.OS === "web") {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const type =
      blob.type && blob.type !== "application/octet-stream"
        ? blob.type
        : mimeType;
    form.append("photos", new File([blob], filename, { type }));
    return;
  }

  form.append(
    "photos",
    {
      uri: asset.uri,
      name: filename,
      type: mimeType,
    } as unknown as Blob,
  );
}

/** Upload one or more compressed images; returns public URLs in order. */
export async function uploadListingPhotos(
  assets: LocalPhotoAsset[],
): Promise<string[]> {
  if (assets.length === 0) return [];

  const form = new FormData();
  for (const [index, asset] of assets.entries()) {
    await appendPhoto(form, asset, index);
  }

  const { data } = await api.post<UploadResponse>(
    "/api/listings/photos",
    form,
    {
      transformRequest: (body, headers) => {
        if (body instanceof FormData) {
          stripMultipartContentType(headers);
        }
        return body;
      },
      timeout: 60_000,
    },
  );

  return data.data.urls;
}
