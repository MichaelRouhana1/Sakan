import * as ImageManipulator from "expo-image-manipulator";
import {
  boundedCrop,
  type CropRect,
  type DecodedPhoto,
  type PhotoSource,
} from "@/lib/photoCropGeometry";
export async function decodePhoto(source: PhotoSource): Promise<DecodedPhoto> {
  // Normalize EXIF orientation before coordinates are offered to the cropper.
  const image = await ImageManipulator.manipulateAsync(source.uri, [], {
    format: ImageManipulator.SaveFormat.PNG,
  });
  return {
    ...source,
    uri: image.uri,
    width: image.width,
    height: image.height,
  };
}
export async function exportPhotoCrop(
  source: DecodedPhoto,
  rect: CropRect,
): Promise<string> {
  const crop = boundedCrop(rect, source.width, source.height);
  const image = await ImageManipulator.manipulateAsync(
    source.uri,
    [
      {
        crop: {
          originX: crop.x,
          originY: crop.y,
          width: crop.width,
          height: crop.height,
        },
      },
    ],
    { format: ImageManipulator.SaveFormat.PNG },
  );
  return image.uri;
}
// ImageManipulator files live in the OS-managed cache; picker originals are not owned.
export function releasePhoto(_source: PhotoSource) {}
