import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import {
  PhotoPickerGridDragGhost,
  type DragGhostModel,
} from "./PhotoPickerGridDragGhost.web";
import {
  AddPhotoTile,
  MAX_LISTING_PHOTOS,
  PhotoGridFooter,
  PhotoGridHeader,
  PhotoTile,
  pickAndUploadPhotos,
  photoPickerStyles,
  reorderPhotos,
  TileEnter,
  uploadDraft,
  type DraftPhoto,
  type PhotoPickerGridProps,
} from "./PhotoPickerGrid.shared";

export type { DraftPhoto } from "./PhotoPickerGrid.shared";
export { MAX_LISTING_PHOTOS, MIN_LISTING_PHOTOS } from "./PhotoPickerGrid.shared";

function isDeleteTarget(target: EventTarget | null) {
  if (!target || typeof (target as Element).closest !== "function") return false;
  return Boolean((target as Element).closest("[data-photo-delete]"));
}

function tileIdFromPoint(x: number, y: number) {
  const el = document.elementFromPoint(x, y);
  const cell = el?.closest?.("[data-photo-tile]");
  return cell?.getAttribute?.("data-photo-tile") ?? null;
}

function displayUri(photo: DraftPhoto) {
  return photo.status === "ready" && photo.url ? photo.url : photo.uri;
}

type PointerDownEvent = {
  target: EventTarget;
  clientX: number;
  clientY: number;
  currentTarget: EventTarget & {
    getBoundingClientRect?: () => DOMRect;
  };
};

export function PhotoPickerGrid({ photos, setPhotos, style }: PhotoPickerGridProps) {
  const remaining = MAX_LISTING_PHOTOS - photos.length;
  const readyCount = photos.filter((p) => p.status === "ready").length;
  const uploading = photos.some((p) => p.status === "uploading");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<DragGhostModel | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const dragIdRef = useRef<string | null>(null);
  const lastOverRef = useRef<string | null>(null);
  const previousCursorRef = useRef<string | null>(null);

  useEffect(() => {
    dragIdRef.current = dragId;
  }, [dragId]);

  useEffect(() => {
    if (!dragId) return;

    previousCursorRef.current = document.body.style.cursor;
    document.body.style.cursor = "grabbing";

    const onMove = (event: PointerEvent) => {
      setPointer({ x: event.clientX, y: event.clientY });

      const activeId = dragIdRef.current;
      const overId = tileIdFromPoint(event.clientX, event.clientY);
      if (!activeId || !overId || overId === activeId) return;
      if (lastOverRef.current === overId) return;
      lastOverRef.current = overId;
      setDropTargetId(overId);
      setPhotos((prev) => reorderPhotos(prev, activeId, overId));
    };

    const endDrag = () => {
      dragIdRef.current = null;
      lastOverRef.current = null;
      setDragId(null);
      setDropTargetId(null);
      setGhost(null);
      document.body.style.cursor = previousCursorRef.current ?? "";
      previousCursorRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      document.body.style.cursor = previousCursorRef.current ?? "";
      previousCursorRef.current = null;
    };
  }, [dragId, setPhotos]);

  function removePhoto(localId: string) {
    setPhotos((prev) => prev.filter((p) => p.localId !== localId));
  }

  function webReorderProps(photo: DraftPhoto) {
    return {
      onPointerDown: (event: PointerDownEvent) => {
        if (isDeleteTarget(event.target)) return;

        const rect = event.currentTarget.getBoundingClientRect?.();
        if (!rect) return;

        const nextGhost: DragGhostModel = {
          localId: photo.localId,
          uri: displayUri(photo),
          width: rect.width,
          height: rect.height,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
        };

        dragIdRef.current = photo.localId;
        lastOverRef.current = null;
        setPointer({ x: event.clientX, y: event.clientY });
        setGhost(nextGhost);
        setDragId(photo.localId);
        setDropTargetId(null);
      },
    };
  }

  return (
    <View style={[photoPickerStyles.root, style]}>
      <PhotoGridHeader photoCount={photos.length} uploading={uploading} />

      <View style={photoPickerStyles.grid}>
        {photos.map((photo, index) => (
          <View key={photo.localId} style={photoPickerStyles.cell}>
            <TileEnter index={index}>
              <PhotoTile
                photo={photo}
                index={index}
                isDragging={dragId === photo.localId}
                isDropTarget={dropTargetId === photo.localId}
                onRemove={() => removePhoto(photo.localId)}
                onRetry={() =>
                  void uploadDraft(photo.localId, photo.uri, setPhotos)
                }
                webDragProps={webReorderProps(photo)}
                photoTileId={photo.localId}
              />
            </TileEnter>
          </View>
        ))}
        {remaining > 0 ? (
          <AddPhotoTile
            remaining={remaining}
            index={photos.length}
            onPress={() => void pickAndUploadPhotos(remaining, setPhotos)}
          />
        ) : null}
      </View>

      <PhotoGridFooter readyCount={readyCount} />

      {ghost ? <PhotoPickerGridDragGhost ghost={ghost} pointer={pointer} /> : null}
    </View>
  );
}
