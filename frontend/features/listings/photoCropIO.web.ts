import {
  boundedCrop,
  type CropRect,
  type DecodedPhoto,
  type PhotoSource,
} from "@/lib/photoCropGeometry";
function load(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      image.naturalWidth && image.naturalHeight
        ? resolve(image)
        : reject(new Error("Empty image"));
    image.onerror = reject;
    image.src = uri;
  });
}
export async function decodePhoto(source: PhotoSource): Promise<DecodedPhoto> {
  // Browser decoding applies EXIF orientation; preview and canvas use that same bitmap.
  const image = await load(source.uri);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(image, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Image decoding failed")),
      "image/png",
    ),
  );
  return {
    ...source,
    uri: URL.createObjectURL(blob),
    owned: true,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}
// Vault's react-easy-crop + source-pixel canvas export pattern (MichaelRouhana1/VaultDev).
export async function exportPhotoCrop(
  source: DecodedPhoto,
  rect: CropRect,
): Promise<string> {
  const image = await load(source.uri);
  const crop = boundedCrop(rect, source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );
  // Lossless intermediate; the existing upload pipeline owns JPEG compression.
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(URL.createObjectURL(blob))
          : reject(new Error("Crop failed")),
      "image/png",
    ),
  );
}
export function releasePhoto(source: PhotoSource) {
  if (source.owned && source.uri.startsWith("blob:"))
    URL.revokeObjectURL(source.uri);
}
