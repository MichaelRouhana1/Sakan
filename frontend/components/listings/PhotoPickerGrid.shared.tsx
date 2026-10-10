import { PHOTO_CAPTION_LIMIT, normalizePhotoCaption } from "@/lib/photoCaption";
import {
  beginPhotoUpload,
  endPhotoUpload,
  holdPhotoUri,
  releasePhotoHold,
  removePhotoUri,
} from "@/features/listings/photoUriOwnership";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  useEffect,
  useRef,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import {
  compressListingPhoto,
  uploadListingPhotos,
} from "@/features/listings/uploadListingPhotos";
import { isAxiosError } from "axios";
import { useReducedMotion } from "@/lib/useReducedMotion";

export const MAX_LISTING_PHOTOS = 15;
export const MIN_LISTING_PHOTOS = 3;

export type DraftPhoto = {
  localId: string;
  uri: string;
  url?: string;
  caption?: string;
  status: "uploading" | "ready" | "error";
  error?: string;
};

export type PhotoPickerGridProps = {
  photos: DraftPhoto[];
  setPhotos: Dispatch<SetStateAction<DraftPhoto[]>>;
  style?: ViewStyle;
};

type PendingDelete = { photo: DraftPhoto; uris: string[] };
const pendingDeletes = new Map<string, PendingDelete>();

export function holdDeletedPhoto(photo: DraftPhoto) {
  if (pendingDeletes.has(photo.localId)) return false;
  const snapshot = { ...photo };
  pendingDeletes.set(photo.localId, { photo: snapshot, uris: [snapshot.uri] });
  holdPhotoUri(snapshot.uri);
  return true;
}

export function patchDeletedPhoto(
  localId: string,
  patch: Partial<DraftPhoto>,
) {
  const entry = pendingDeletes.get(localId);
  if (!entry) return false;
  if (
    patch.uri &&
    patch.uri !== entry.photo.uri &&
    !entry.uris.includes(patch.uri)
  ) {
    entry.uris.push(patch.uri);
    holdPhotoUri(patch.uri);
  }
  entry.photo = { ...entry.photo, ...patch };
  return true;
}

export function undoDeletedPhoto(localId: string) {
  const entry = pendingDeletes.get(localId);
  if (!entry) return null;
  pendingDeletes.delete(localId);
  for (const uri of entry.uris) {
    releasePhotoHold(uri);
    if (uri !== entry.photo.uri) removePhotoUri(uri);
  }
  return entry.photo;
}

export function commitDeletedPhoto(localId: string) {
  const entry = pendingDeletes.get(localId);
  if (!entry) return;
  pendingDeletes.delete(localId);
  for (const uri of entry.uris) {
    releasePhotoHold(uri);
    removePhotoUri(uri);
  }
}

function settleDraftPhoto(
  localId: string,
  setPhotos: Dispatch<SetStateAction<DraftPhoto[]>>,
  patch: Partial<DraftPhoto>,
  orphanUri?: string,
) {
  setPhotos((prev) => {
    if (!prev.some((p) => p.localId === localId)) {
      if (!patchDeletedPhoto(localId, patch) && orphanUri)
        removePhotoUri(orphanUri);
      return prev;
    }
    return prev.map((p) => (p.localId === localId ? { ...p, ...patch } : p));
  });
}

export function TileEnter({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translate = useRef(new Animated.Value(reduceMotion ? 0 : 12)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay: Math.min(index, 6) * 40,
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 280,
        delay: Math.min(index, 6) * 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, reduceMotion, translate]);

  return (
    <Animated.View
      style={{
        width: "100%",
        opacity,
        transform: [{ translateY: translate }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export async function uploadDraft(
  localId: string,
  uri: string,
  setPhotos: Dispatch<SetStateAction<DraftPhoto[]>>,
) {
  setPhotos((prev) => {
    if (!prev.some((p) => p.localId === localId)) {
      patchDeletedPhoto(localId, { status: "uploading", error: undefined });
      return prev;
    }
    return prev.map((p) =>
      p.localId === localId
        ? { ...p, status: "uploading", error: undefined }
        : p,
    );
  });
  beginPhotoUpload(uri);
  let succeeded = false;
  let compressedUri: string | undefined;
  try {
    const compressed = await compressListingPhoto(uri);
    compressedUri = compressed.uri;
    const [url] = await uploadListingPhotos([
      { uri: compressed.uri, mimeType: compressed.mimeType },
    ]);
    settleDraftPhoto(
      localId,
      setPhotos,
      { uri: compressed.uri, url, status: "ready", error: undefined },
      compressed.uri,
    );
    succeeded = true;
  } catch (err) {
    const message =
      isAxiosError(err) &&
      typeof err.response?.data?.error?.message === "string"
        ? err.response.data.error.message
        : "Upload failed — tap to retry";
    settleDraftPhoto(
      localId,
      setPhotos,
      { status: "error", error: message },
      compressedUri && compressedUri !== uri ? compressedUri : undefined,
    );
  } finally {
    endPhotoUpload(uri, succeeded);
  }
}

export function reorderPhotos(
  photos: DraftPhoto[],
  fromId: string,
  toId: string,
): DraftPhoto[] {
  if (fromId === toId) return photos;
  const fromIndex = photos.findIndex((p) => p.localId === fromId);
  const toIndex = photos.findIndex((p) => p.localId === toId);
  if (fromIndex < 0 || toIndex < 0) return photos;
  const copy = [...photos];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  return copy;
}

type PhotoTileProps = {
  photo: DraftPhoto;
  index: number;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onRemove: () => void;
  onRetry: () => void;
  onDrag?: () => void;
  onCaption: (value: string) => void;
  webDragProps?: Record<string, unknown>;
  photoTileId?: string;
  style?: ViewStyle;
};

export function PhotoTile({
  photo,
  index,
  isDragging,
  isDropTarget,
  onRemove,
  onRetry,
  onDrag,
  onCaption,
  webDragProps,
  photoTileId,
  style,
}: PhotoTileProps) {
  const imageUri =
    photo.status === "ready" && photo.url ? photo.url : photo.uri;

  return (
    <View
      style={[
        photoPickerStyles.tileWrap,
        isDragging && photoPickerStyles.cellDragging,
        isDragging && Platform.OS === "web"
          ? photoPickerStyles.cellPlaceholder
          : null,
        isDropTarget && photoPickerStyles.cellDropTarget,
        style,
      ]}
      {...(Platform.OS === "web" && photoTileId
        ? ({ dataSet: { photoTile: photoTileId } } as object)
        : {})}
    >
      <View
        {...webDragProps}
        style={[
          photoPickerStyles.tile,
          Platform.OS === "web" ? photoPickerStyles.webDraggable : null,
          isDragging && Platform.OS === "web"
            ? photoPickerStyles.tilePlaceholder
            : null,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            photo.status === "error"
              ? "Retry photo upload"
              : index === 0
                ? "Cover photo, drag to reorder"
                : `Photo ${index + 1}, drag to reorder`
          }
          onPress={() => {
            if (photo.status === "error") onRetry();
          }}
          onLongPress={onDrag}
          delayLongPress={120}
          style={[
            StyleSheet.absoluteFill,
            isDragging && Platform.OS === "web"
              ? photoPickerStyles.tileContentHidden
              : null,
            {
              pointerEvents:
                Platform.OS === "web" && photo.status !== "error"
                  ? "none"
                  : "auto",
            },
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={photoPickerStyles.image}
            contentFit="cover"
            transition={200}
          />
          <View style={photoPickerStyles.tileWash} />

          {photo.status === "uploading" ? (
            <View style={photoPickerStyles.statusOverlay}>
              <ActivityIndicator color={Lister.color.surface} />
            </View>
          ) : null}

          {photo.status === "error" ? (
            <View style={photoPickerStyles.statusOverlay}>
              <Ionicons name="refresh" size={22} color={Lister.color.surface} />
              <LText variant="caption" style={photoPickerStyles.errorText}>
                Retry
              </LText>
            </View>
          ) : null}

          {photo.status === "ready" ? (
            <View
              style={photoPickerStyles.readyDot}
              accessibilityLabel="Uploaded"
            />
          ) : null}
        </Pressable>

        {!isDragging ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            onPress={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            {...(Platform.OS === "web"
              ? ({
                  dataSet: { photoDelete: "true" },
                  onPointerDown: (event: { stopPropagation: () => void }) => {
                    event.stopPropagation();
                  },
                } as object)
              : {})}
            style={photoPickerStyles.deleteBtn}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={Lister.color.surface}
            />
          </Pressable>
        ) : null}

        {!isDragging && index === 0 ? (
          <View style={photoPickerStyles.coverBadge}>
            <LText variant="caption" style={photoPickerStyles.coverBadgeText}>
              Cover
            </LText>
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: 8, gap: 4 }}>
        <LText variant="caption" tone="muted">
          Optional caption
        </LText>
        <TextInput
          accessibilityLabel={`Caption for photo ${index + 1}`}
          placeholder="e.g. Sofa bed sleeps 2"
          placeholderTextColor={Lister.color.inkMuted}
          value={photo.caption ?? ""}
          maxLength={PHOTO_CAPTION_LIMIT}
          onChangeText={onCaption}
          onBlur={() => onCaption(normalizePhotoCaption(photo.caption))}
          style={{
            minHeight: 44,
            padding: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: Lister.color.border,
            color: Lister.color.ink,
            backgroundColor: Lister.color.surface,
            fontFamily: Lister.type.body,
            fontSize: 14,
          }}
        />
        <LText variant="caption" tone="faint" style={{ textAlign: "right" }}>
          {(photo.caption ?? "").length}/{PHOTO_CAPTION_LIMIT}
        </LText>
      </View>
    </View>
  );
}

export function AddPhotoTile({
  remaining,
  index,
  onPress,
  dropActive,
  disabled = false,
}: {
  remaining: number;
  index: number;
  onPress: () => void;
  dropActive?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={photoPickerStyles.cell}>
      <TileEnter index={index}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          accessibilityState={{ disabled }}
          accessibilityLabel={`Add photos, ${remaining} slots remaining. Drop images here.`}
          onPress={onPress}
          style={[
            photoPickerStyles.addTile,
            dropActive && photoPickerStyles.addTileDropOn,
          ]}
        >
          <View style={photoPickerStyles.addIcon}>
            <Ionicons
              name="images-outline"
              size={26}
              color={Lister.color.primary}
            />
          </View>
          <LText
            variant="caption"
            tone="primary"
            style={photoPickerStyles.addLabel}
          >
            {dropActive ? "Drop photos" : "Add photos"}
          </LText>
          <LText variant="caption" tone="faint">
            {dropActive
              ? "Release to crop"
              : Platform.OS === "web"
                ? `Drop or browse · ${remaining} left`
                : `${remaining} left`}
          </LText>
        </Pressable>
      </TileEnter>
    </View>
  );
}

export function PhotoGridHeader({
  photoCount,
  uploading,
}: {
  photoCount: number;
  uploading: boolean;
}) {
  return (
    <>
      <View style={photoPickerStyles.headerRow}>
        <View style={photoPickerStyles.headerCopy}>
          <LText
            nativeID="photo-step-heading"
            accessibilityRole="header"
            tabIndex={-1}
            variant="subtitle"
          >
            Photos of the place
          </LText>
          <LText variant="body" tone="muted">
            {Platform.OS === "web"
              ? "Drop images here or click to add. Drag photos to reorder. First is the search cover."
              : "Drag to reorder. First photo is the cover renters see in search."}
          </LText>
        </View>
        <View
          style={photoPickerStyles.countPill}
          accessibilityLabel={`${photoCount} of ${MAX_LISTING_PHOTOS} photos`}
        >
          <LText variant="caption" style={photoPickerStyles.countText}>
            {photoCount} of {MAX_LISTING_PHOTOS}
          </LText>
        </View>
      </View>
      {uploading ? (
        <View style={photoPickerStyles.progressRow}>
          <ActivityIndicator size="small" color={Lister.color.primary} />
          <LText variant="caption" tone="muted">
            Compressing & uploading…
          </LText>
        </View>
      ) : null}
    </>
  );
}

export function PhotoGridFooter({ readyCount }: { readyCount: number }) {
  if (readyCount < MIN_LISTING_PHOTOS) {
    return (
      <LText variant="caption" tone="muted">
        Add at least {MIN_LISTING_PHOTOS} photos to publish.
      </LText>
    );
  }
  return (
    <LText variant="caption" tone="muted">
      {readyCount} ready · first image is your cover in the feed.
    </LText>
  );
}

export const photoPickerStyles = StyleSheet.create({
  root: { gap: 14 },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  headerCopy: { flex: 1, gap: 6 },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Lister.radius.pill,
    backgroundColor: Lister.color.primaryMist,
    borderWidth: 1,
    borderColor: Lister.color.primarySoft,
  },
  countText: {
    color: Lister.color.primaryDeep,
    fontFamily: Lister.type.bodySemi,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  nativeGrid: {
    gap: 12,
  },
  columnWrap: {
    gap: 12,
  },
  cell: {
    width: "47.5%",
  },
  tileWrap: {
    width: "100%",
  },
  nativeCell: {
    flex: 1,
    marginBottom: 12,
  },
  cellDragging: Platform.select({
    web: { opacity: 1 } as ViewStyle,
    default: { opacity: 0.72 },
  }),
  cellPlaceholder: Platform.select({
    web: {
      opacity: 1,
    } as ViewStyle,
    default: {},
  }),
  tilePlaceholder: Platform.select({
    web: {
      borderStyle: "dashed",
      borderColor: Lister.color.border,
      backgroundColor: Lister.color.bgWash,
    } as ViewStyle,
    default: {},
  }),
  tileContentHidden: Platform.select({
    web: {
      opacity: 0,
    } as ViewStyle,
    default: {},
  }),
  cellDropTarget: {
    borderWidth: 2,
    borderColor: Lister.color.primary,
    borderRadius: Lister.radius.lg,
  },
  webDraggable: Platform.select({
    web: {
      cursor: "grab",
      touchAction: "none",
      userSelect: "none",
    } as unknown as ViewStyle,
    default: {},
  }),
  tile: {
    aspectRatio: 1,
    borderRadius: Lister.radius.lg,
    overflow: "hidden",
    backgroundColor: Lister.color.bgWash,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  tileWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(18,24,38,0.06)",
    pointerEvents: "none",
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(18,24,38,0.62)",
    zIndex: 2,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : null),
  },
  coverBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: Lister.color.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Lister.radius.pill,
    pointerEvents: "none",
  },
  coverBadgeText: {
    color: Lister.color.surface,
    fontFamily: Lister.type.bodySemi,
    fontSize: 11,
  },
  statusOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(18,24,38,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  errorText: {
    color: Lister.color.surface,
    fontFamily: Lister.type.bodySemi,
  },
  readyDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Lister.color.success,
    borderWidth: 1.5,
    borderColor: Lister.color.surface,
  },
  addTile: {
    aspectRatio: 1,
    borderRadius: Lister.radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : null),
  },
  addTileDropOn: {
    borderStyle: "solid",
    backgroundColor: Lister.color.primarySoft,
  },
  dropCatcher: {
    position: "relative",
  },
  fileDropOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: Lister.radius.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Lister.color.primary,
    backgroundColor: "rgba(47, 111, 237, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6,
    pointerEvents: "none",
  },
  fileDropOverlayText: {
    color: Lister.color.primaryDeep,
    fontFamily: Lister.type.bodySemi,
  },
  addIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Lister.color.primarySoft,
  },
  addLabel: {
    fontFamily: Lister.type.bodySemi,
  },
});
