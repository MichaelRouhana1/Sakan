import { usePhotoCropQueue } from "@/features/listings/usePhotoCropQueue";
import { PhotoCropModal } from "./photos/PhotoCropModal";
import { PhotoGuidance } from "./photos/PhotoGuidance";
import { SwipeToast, type SwipeToastReason } from "@/components/ui/SwipeToast.web";
import { createElement, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { LText } from "@/components/lister/Typography";
import {
  edgeAutoScrollStep,
  movePhotoByIndex,
  targetSlotIndexForCenter,
  type PhotoSlotRect,
} from "@/lib/photoGridGeometry";
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
  usePhotoPickerStyles,
  commitDeletedPhoto,
  holdDeletedPhoto,
  photoDisplayUri,
  TileEnter,
  undoDeletedPhoto,
  uploadDraft,
  type DraftPhoto,
  type PhotoPickerGridProps,
} from "./PhotoPickerGrid.shared";

const PHOTO_TOAST_STACK = 66;
const TOUCH_HOLD_MS = 200;
const TOUCH_SCROLL_SLOP = 8;
const MOUSE_HOLD_MS = 140;
const MOUSE_DRAG_SLOP = 4;

type DeletedToast = { localId: string; index: number };

export type { DraftPhoto } from "./PhotoPickerGrid.shared";
export {
  MAX_LISTING_PHOTOS,
  MIN_LISTING_PHOTOS,
} from "./PhotoPickerGrid.shared";

function isFileDrag(event: DragEvent): boolean {
  const types = Array.from(event.dataTransfer?.types ?? []);
  return types.includes("Files") || types.includes("application/x-moz-file");
}

function imageFilesFromDrop(event: DragEvent): File[] {
  return Array.from(event.dataTransfer?.files ?? []);
}

function isDeleteTarget(target: EventTarget | null) {
  if (!target || typeof (target as Element).closest !== "function")
    return false;
  return Boolean((target as Element).closest("[data-photo-delete]"));
}

function readSlotRects(container: HTMLElement | null): PhotoSlotRect[] {
  if (!container) return [];
  const tiles = Array.from(
    container.querySelectorAll<HTMLElement>("[data-photo-tile]"),
  );
  return tiles.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      x: r.left,
      y: r.top,
      width: r.width,
      height: r.height,
      imageHeight: r.width,
    };
  });
}

function findScrollableAncestor(start: HTMLElement | null): HTMLElement | null {
  let el = start;
  while (el) {
    const overflow = getComputedStyle(el).overflowY;
    if (/(auto|scroll)/.test(overflow) && el.scrollHeight > el.clientHeight) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

type PointerDownEvent = {
  button?: number;
  pointerId?: number;
  pointerType?: string;
  target: EventTarget;
  clientX: number;
  clientY: number;
  nativeEvent?: PointerEvent;
  currentTarget: EventTarget & {
    getBoundingClientRect?: () => DOMRect;
  };
};

export function PhotoPickerGrid({
  shared = false,
  photos,
  setPhotos,
  style,
}: PhotoPickerGridProps) {
  const { size: designSize } = useDesktopDesign();
  const photoPickerStyles = usePhotoPickerStyles();
  const cropController = usePhotoCropQueue({ photos, setPhotos });
  const remaining = MAX_LISTING_PHOTOS - photos.length;
  const readyCount = photos.filter((p) => p.status === "ready").length;
  const uploading = photos.some((p) => p.status === "uploading");
  const [dragId, setDragId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<DragGhostModel | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [fileDropActive, setFileDropActive] = useState(false);
  const [deleteToasts, setDeleteToasts] = useState<DeletedToast[]>([]);
  const deleteToastsRef = useRef(deleteToasts);
  deleteToastsRef.current = deleteToasts;

  const photosRef = useRef(photos);
  photosRef.current = photos;
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const remainingRef = useRef(remaining);
  const queueRef = useRef(cropController.queue);
  remainingRef.current = remaining;

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
      for (const toast of deleteToastsRef.current)
        commitDeletedPhoto(toast.localId);
    };
  }, []);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const onEnter = (event: DragEvent) => {
      if (
        !isFileDrag(event) ||
        remainingRef.current <= 0 ||
        queueRef.current.state.phase !== "idle"
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setFileDropActive(true);
    };
    const onOver = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      const related = event.relatedTarget as Node | null;
      if (related && el.contains(related)) return;
      setFileDropActive(false);
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setFileDropActive(false);
      if (queueRef.current.state.phase !== "idle") return;
      const sources = imageFilesFromDrop(event).map((file) => ({
        uri: URL.createObjectURL(file),
        name: file.name,
        owned: true,
      }));
      void queueRef.current.admit(sources);
    };

    el.addEventListener("dragenter", onEnter);
    el.addEventListener("dragover", onOver);
    el.addEventListener("dragleave", onLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragenter", onEnter);
      el.removeEventListener("dragover", onOver);
      el.removeEventListener("dragleave", onLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  function removePhoto(localId: string) {
    const index = photos.findIndex((p) => p.localId === localId);
    if (index < 0 || !holdDeletedPhoto(photos[index])) return;
    setDeleteToasts((prev) => [
      ...prev.filter((toast) => toast.localId !== localId),
      { localId, index },
    ]);
    setPhotos((prev) => prev.filter((p) => p.localId !== localId));
  }

  function restorePhoto(localId: string, index: number) {
    const photo = undoDeletedPhoto(localId);
    if (!photo) return;
    setPhotos((prev) => {
      if (prev.some((p) => p.localId === photo.localId)) return prev;
      const next = [...prev];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, photo);
      return next;
    });
  }

  function finishDelete(localId: string, reason: SwipeToastReason) {
    if (reason !== "action") commitDeletedPhoto(localId);
    setDeleteToasts((prev) => prev.filter((toast) => toast.localId !== localId));
  }

  function startReorderSession(photo: DraftPhoto, event: PointerDownEvent) {
    const native = event.nativeEvent;
    const button = native?.button ?? event.button ?? 0;
    if (button !== 0) return;
    if (isDeleteTarget(event.target)) return;
    if (photosRef.current.length < 2 || photo.status === "error") return;

    const targetEl = event.currentTarget;
    const initialRect = targetEl.getBoundingClientRect?.();
    if (!initialRect) return;

    cleanupDragRef.current?.();

    const pointerId = native?.pointerId ?? event.pointerId ?? 0;
    const pointerType = native?.pointerType ?? event.pointerType ?? "mouse";
    const isTouch = pointerType === "touch";
    const origin = { x: event.clientX, y: event.clientY };
    let currentPoint = { ...origin };
    let activeGhostModel: DragGhostModel | null = null;
    let started = false;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let autoScrollFrame = 0;
    let previousCursor = "";
    let previousSelect = "";

    const reorderAtPoint = (point: { x: number; y: number }) => {
      if (!activeGhostModel) return;
      const rects = readSlotRects(dropRef.current);
      if (rects.length < 2) return;
      const liveIndex = photosRef.current.findIndex(
        (p) => p.localId === photo.localId,
      );
      if (liveIndex < 0) return;

      const center = {
        x: point.x - activeGhostModel.offsetX + activeGhostModel.width / 2,
        y: point.y - activeGhostModel.offsetY + activeGhostModel.height / 2,
      };
      const targetIndex = targetSlotIndexForCenter(center, rects, liveIndex);
      if (
        targetIndex !== liveIndex &&
        targetIndex >= 0 &&
        targetIndex < photosRef.current.length
      ) {
        if (isTouch && typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(6);
        }
        setPhotos((prev) => {
          const from = prev.findIndex((p) => p.localId === photo.localId);
          if (from < 0) return prev;
          const to = Math.min(targetIndex, prev.length - 1);
          if (from === to) return prev;
          return movePhotoByIndex(prev, from, to);
        });
      }
    };

    const runAutoScroll = () => {
      if (!started) return;
      const scroller = findScrollableAncestor(dropRef.current);
      if (scroller) {
        const rect = scroller.getBoundingClientRect();
        const top = Math.max(0, rect.top);
        const bottom = Math.min(window.innerHeight, rect.bottom);
        const step = edgeAutoScrollStep(currentPoint.y, top, bottom, 64, 12);
        if (step !== 0) {
          const prevTop = scroller.scrollTop;
          scroller.scrollTop += step;
          if (scroller.scrollTop !== prevTop) {
            reorderAtPoint(currentPoint);
          }
        }
      }
      autoScrollFrame = requestAnimationFrame(runAutoScroll);
    };

    const preventTouchScroll = (e: TouchEvent) => {
      if (started && e.cancelable) e.preventDefault();
    };

    const preventContextMenu = (e: MouseEvent) => {
      if (started || isTouch) e.preventDefault();
    };

    const activate = () => {
      if (started) return;
      if (holdTimer != null) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      const rect = targetEl.getBoundingClientRect?.() ?? initialRect;
      activeGhostModel = {
        localId: photo.localId,
        uri: photoDisplayUri(photo),
        width: rect.width,
        height: rect.height,
        offsetX: currentPoint.x - rect.left,
        offsetY: currentPoint.y - rect.top,
      };
      started = true;
      previousCursor = document.body.style.cursor;
      previousSelect = document.body.style.userSelect;
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      if (isTouch && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
      }
      setPointer(currentPoint);
      setGhost(activeGhostModel);
      setDragId(photo.localId);
      autoScrollFrame = requestAnimationFrame(runAutoScroll);
    };

    const suppressReleaseClick = () => {
      const release = () => {
        clearTimeout(timer);
        window.removeEventListener("click", suppress, true);
        window.removeEventListener("pointerdown", release, true);
      };
      const suppress = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        release();
      };
      const timer = window.setTimeout(release, 400);
      window.addEventListener("click", suppress, true);
      window.addEventListener("pointerdown", release, true);
    };

    const cleanup = () => {
      if (holdTimer != null) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      cancelAnimationFrame(autoScrollFrame);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("touchmove", preventTouchScroll, true);
      window.removeEventListener("contextmenu", preventContextMenu, true);
      window.removeEventListener("pointerup", onEnd, true);
      window.removeEventListener("pointercancel", onEnd, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("blur", onCancel);
      if (started) {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousSelect;
      }
      cleanupDragRef.current = null;
    };

    const onMove = (e: PointerEvent) => {
      if (pointerId && e.pointerId !== pointerId) return;
      currentPoint = { x: e.clientX, y: e.clientY };
      if (!started) {
        const dist = Math.hypot(
          currentPoint.x - origin.x,
          currentPoint.y - origin.y,
        );
        if (isTouch) {
          if (dist >= TOUCH_SCROLL_SLOP) {
            cleanup();
          }
          return;
        }
        if (dist >= MOUSE_DRAG_SLOP) {
          activate();
        } else {
          return;
        }
      }
      setPointer(currentPoint);
      reorderAtPoint(currentPoint);
    };

    const finish = () => {
      const wasStarted = started;
      cleanup();
      if (wasStarted) {
        setDragId(null);
        setGhost(null);
        suppressReleaseClick();
      }
    };

    const onEnd = (e: PointerEvent) => {
      if (pointerId && e.pointerId !== pointerId) return;
      finish();
    };

    const onCancel = () => {
      finish();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      }
    };

    holdTimer = setTimeout(activate, isTouch ? TOUCH_HOLD_MS : MOUSE_HOLD_MS);
    cleanupDragRef.current = cleanup;
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("touchmove", preventTouchScroll, {
      capture: true,
      passive: false,
    });
    window.addEventListener("contextmenu", preventContextMenu, true);
    window.addEventListener("pointerup", onEnd, true);
    window.addEventListener("pointercancel", onEnd, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("blur", onCancel);
  }

  function webReorderProps(photo: DraftPhoto) {
    return {
      onPointerDown: (event: PointerDownEvent) => {
        startReorderSession(photo, event);
      },
    };
  }

  const activeGhostIndex = ghost
    ? photos.findIndex((p) => p.localId === ghost.localId)
    : -1;

  return (
    <View style={[photoPickerStyles.root, style]}>
      <PhotoGridHeader
        shared={shared}
        photoCount={photos.length}
        uploading={uploading}
      />
      <PhotoGuidance />
      {!cropController.locked &&
        cropController.state.notices.map((notice, i) => (
          <LText key={i} accessibilityLiveRegion="polite" variant="caption">
            {notice}
          </LText>
        ))}
      <PhotoCropModal controller={cropController} photoCount={photos.length} />

      {createElement(
        "div",
        {
          ref: dropRef,
          "data-photo-drop": "true",
          style: { position: "relative" },
        },
        <View style={photoPickerStyles.grid}>
          {photos.map((photo, index) => (
            <View key={photo.localId} style={photoPickerStyles.cell}>
              <TileEnter index={index}>
                <PhotoTile
                  shared={shared}
                  onCaption={(caption) =>
                    setPhotos((prev) =>
                      prev.map((p) =>
                        p.localId === photo.localId ? { ...p, caption } : p,
                      ),
                    )
                  }
                  photo={photo}
                  index={index}
                  isDragging={dragId === photo.localId}
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
              dropActive={fileDropActive}
              disabled={cropController.locked}
              onPress={() => void cropController.pick()}
            />
          ) : null}
        </View>,
        fileDropActive && remaining > 0 ? (
          <View style={photoPickerStyles.fileDropOverlay}>
            <LText
              variant="subtitle"
              style={photoPickerStyles.fileDropOverlayText}
            >
              Drop to add photos
            </LText>
          </View>
        ) : null,
      )}

      <PhotoGridFooter shared={shared} readyCount={readyCount} />

      {ghost ? (
        <PhotoPickerGridDragGhost
          ghost={ghost}
          pointer={pointer}
          showCover={!shared && activeGhostIndex === 0}
        />
      ) : null}
      {deleteToasts.map((toast, index) => (
        <SwipeToast
          key={toast.localId}
          title="Image Deleted"
          actionLabel="Undo"
          placement="above-footer"
          stack={
            (deleteToasts.length - 1 - index) * designSize(PHOTO_TOAST_STACK)
          }
          layer={index}
          onAction={() => restorePhoto(toast.localId, toast.index)}
          onClose={(reason) => finishDelete(toast.localId, reason)}
        />
      ))}
    </View>
  );
}
