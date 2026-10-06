import { useEffect, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Keyboard, Platform } from "react-native";
import { PhotoCropQueue, type CropQueueState } from "@/lib/photoCropQueue";
import { decodePhoto, exportPhotoCrop, releasePhoto } from "./photoCropIO";
import {
  MAX_LISTING_PHOTOS,
  uploadDraft,
  type PhotoPickerGridProps,
} from "@/components/listings/PhotoPickerGrid.shared";
export function usePhotoCropQueue({ photos, setPhotos }: PhotoPickerGridProps) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const latest = useRef({ photos, setPhotos });
  latest.current = { photos, setPhotos };
  const [state, setState] = useState<CropQueueState>({
    phase: "idle",
    position: 0,
    total: 0,
    notices: [],
  });
  const [queue] = useState(
    () =>
      new PhotoCropQueue({
        capacity: () => MAX_LISTING_PHOTOS - latest.current.photos.length,
        decode: decodePhoto,
        exportCrop: exportPhotoCrop,
        release: releasePhoto,
        changed: setState,
        commit: (uri) => {
          const photo = {
            localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            uri,
            status: "uploading" as const,
          };
          // Reserve immediately, before React can render the next intake.
          latest.current.photos = [...latest.current.photos, photo];
          latest.current.setPhotos((prev) => [...prev, photo]);
          void uploadDraft(photo.localId, uri, latest.current.setPhotos);
        },
      }),
  );
  useEffect(() => () => queue.finish(), [queue]);
  async function pick() {
    if (Platform.OS === "web")
      returnFocus.current = document.activeElement as HTMLElement;
    const token = queue.beginPick();
    if (token === null) return;
    Keyboard.dismiss();
    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          queue.pickerFailed(token, "Allow photo access to select images.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: Math.max(
          1,
          MAX_LISTING_PHOTOS - latest.current.photos.length,
        ),
        quality: 1,
      });
      if (result.canceled) {
        queue.pickerFailed(token);
        return;
      }
      await queue.admit(
        result.assets.map((a, i) => ({
          uri: a.uri,
          name: a.fileName || `Photo ${i + 1}`,
          owned: Platform.OS === "web" && a.uri.startsWith("blob:"),
        })),
        token,
      );
    } catch {
      queue.pickerFailed(token, "Couldn't open your photos. Please try again.");
    }
  }
  return { queue, state, pick, returnFocus, locked: state.phase !== "idle" };
}
export type PhotoCropController = ReturnType<typeof usePhotoCropQueue>;
