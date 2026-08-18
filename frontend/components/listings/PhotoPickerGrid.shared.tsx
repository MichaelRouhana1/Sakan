import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
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
  setPhotos((prev) =>
    prev.map((p) =>
      p.localId === localId
        ? { ...p, status: "uploading", error: undefined }
        : p,
    ),
  );
  try {
    const compressed = await compressListingPhoto(uri);
    const [url] = await uploadListingPhotos([
      { uri: compressed.uri, mimeType: compressed.mimeType },
    ]);
    setPhotos((prev) =>
      prev.map((p) =>
        p.localId === localId
          ? { ...p, uri: compressed.uri, url, status: "ready" }
          : p,
      ),
    );
  } catch (err) {
    const message =
      isAxiosError(err) &&
      typeof err.response?.data?.error?.message === "string"
        ? err.response.data.error.message
        : "Upload failed — tap to retry";
    setPhotos((prev) =>
      prev.map((p) =>
        p.localId === localId
          ? {
              ...p,
              status: "error",
              error: message,
            }
          : p,
      ),
    );
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

export async function pickAndUploadPhotos(
  remaining: number,
  setPhotos: Dispatch<SetStateAction<DraftPhoto[]>>,
) {
  if (remaining <= 0) return;

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 1,
  });

  if (result.canceled || result.assets.length === 0) return;

  const slots = result.assets.slice(0, remaining);
  const drafts: DraftPhoto[] = slots.map((asset, index) => ({
    localId: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    uri: asset.uri,
    status: "uploading",
  }));

  setPhotos((prev) => [...prev, ...drafts]);

  await Promise.all(
    drafts.map((draft) => uploadDraft(draft.localId, draft.uri, setPhotos)),
  );
}

type PhotoTileProps = {
  photo: DraftPhoto;
  index: number;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onRemove: () => void;
  onRetry: () => void;
  onDrag?: () => void;
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
        isDragging && Platform.OS === "web" ? photoPickerStyles.cellPlaceholder : null,
        isDropTarget && photoPickerStyles.cellDropTarget,
        Platform.OS === "web"
          ? (photoPickerStyles.webDraggable as ViewStyle)
          : null,
        style,
      ]}
      {...webDragProps}
      {...(Platform.OS === "web" && photoTileId
        ? ({ dataSet: { photoTile: photoTileId } } as object)
        : {})}
    >
      <View
        style={[
          photoPickerStyles.tile,
          isDragging && Platform.OS === "web" ? photoPickerStyles.tilePlaceholder : null,
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
          pointerEvents={Platform.OS === "web" && photo.status !== "error" ? "none" : "auto"}
          style={[
            StyleSheet.absoluteFill,
            isDragging && Platform.OS === "web" ? photoPickerStyles.tileContentHidden : null,
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={photoPickerStyles.image}
            contentFit="cover"
            transition={200}
          />
          <View style={photoPickerStyles.tileWash} pointerEvents="none" />

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
            <View style={photoPickerStyles.readyDot} accessibilityLabel="Uploaded" />
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
                  // @ts-expect-error RN Web data attribute
                  dataSet: { photoDelete: "true" },
                  onPointerDown: (event: { stopPropagation: () => void }) => {
                    event.stopPropagation();
                  },
                } as object)
              : {})}
            style={photoPickerStyles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={16} color={Lister.color.surface} />
          </Pressable>
        ) : null}

        {!isDragging && index === 0 ? (
          <View style={photoPickerStyles.coverBadge} pointerEvents="none">
            <LText variant="caption" style={photoPickerStyles.coverBadgeText}>
              Cover
            </LText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function AddPhotoTile({
  remaining,
  index,
  onPress,
}: {
  remaining: number;
  index: number;
  onPress: () => void;
}) {
  return (
    <View style={photoPickerStyles.cell}>
      <TileEnter index={index}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add photos, ${remaining} slots remaining`}
          onPress={onPress}
          style={photoPickerStyles.addTile}
        >
          <View style={photoPickerStyles.addIcon}>
            <Ionicons name="images-outline" size={26} color={Lister.color.primary} />
          </View>
          <LText variant="caption" tone="primary" style={photoPickerStyles.addLabel}>
            Add photos
          </LText>
          <LText variant="caption" tone="faint">
            {remaining} left
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
          <LText variant="subtitle">Photos of the place</LText>
          <LText variant="body" tone="muted">
            Drag to reorder. First photo is the cover renters see in search.
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
    } as ViewStyle,
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18,24,38,0.06)",
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
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer" } as ViewStyle)
      : null),
  },
  coverBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: Lister.color.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Lister.radius.pill,
  },
  coverBadgeText: {
    color: Lister.color.surface,
    fontFamily: Lister.type.bodySemi,
    fontSize: 11,
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
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
