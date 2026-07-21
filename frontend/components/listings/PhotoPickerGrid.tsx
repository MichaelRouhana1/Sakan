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
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import {
  compressListingPhoto,
  uploadListingPhotos,
} from "@/features/listings/uploadListingPhotos";
import { useReducedMotion } from "@/lib/useReducedMotion";

export const MAX_LISTING_PHOTOS = 8;

export type DraftPhoto = {
  localId: string;
  uri: string;
  url?: string;
  status: "uploading" | "ready" | "error";
  error?: string;
};

type Props = {
  photos: DraftPhoto[];
  setPhotos: Dispatch<SetStateAction<DraftPhoto[]>>;
};

function TileEnter({
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
      style={{ flex: 1, opacity, transform: [{ translateY: translate }] }}
    >
      {children}
    </Animated.View>
  );
}

async function uploadDraft(
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
  } catch {
    setPhotos((prev) =>
      prev.map((p) =>
        p.localId === localId
          ? {
              ...p,
              status: "error",
              error: "Upload failed — tap to retry",
            }
          : p,
      ),
    );
  }
}

export function PhotoPickerGrid({ photos, setPhotos }: Props) {
  const remaining = MAX_LISTING_PHOTOS - photos.length;
  const readyCount = photos.filter((p) => p.status === "ready").length;
  const uploading = photos.some((p) => p.status === "uploading");

  async function pickPhotos() {
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

  function removePhoto(localId: string) {
    setPhotos((prev) => prev.filter((p) => p.localId !== localId));
  }

  function makeCover(localId: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (!target) return prev;
      return [target, ...prev.filter((p) => p.localId !== localId)];
    });
  }

  function movePhoto(localId: string, direction: -1 | 1) {
    setPhotos((prev) => {
      const index = prev.findIndex((p) => p.localId === localId);
      if (index < 0) return prev;
      const next = index + direction;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <LText variant="subtitle">Photos of the place</LText>
          <LText variant="body" tone="muted">
            First photo is the cover renters see in search. Clear, bright rooms
            convert best.
          </LText>
        </View>
        <View style={styles.countPill} accessibilityLabel={`${photos.length} of 8 photos`}>
          <LText variant="caption" style={styles.countText}>
            {photos.length} of {MAX_LISTING_PHOTOS}
          </LText>
        </View>
      </View>

      {uploading ? (
        <View style={styles.progressRow}>
          <ActivityIndicator size="small" color={Lister.color.primary} />
          <LText variant="caption" tone="muted">
            Compressing & uploading…
          </LText>
        </View>
      ) : null}

      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <View key={photo.localId} style={styles.cell}>
            <TileEnter index={index}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  photo.status === "error"
                    ? "Retry photo upload"
                    : index === 0
                      ? "Cover photo"
                      : `Photo ${index + 1}`
                }
                onPress={() => {
                  if (photo.status === "error") {
                    void uploadDraft(photo.localId, photo.uri, setPhotos);
                  }
                }}
                style={styles.tile}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.tileWash} />

                {index === 0 ? (
                  <View style={styles.coverBadge}>
                    <LText variant="caption" style={styles.coverBadgeText}>
                      Cover
                    </LText>
                  </View>
                ) : null}

                {photo.status === "uploading" ? (
                  <View style={styles.statusOverlay}>
                    <ActivityIndicator color={Lister.color.surface} />
                  </View>
                ) : null}

                {photo.status === "error" ? (
                  <View style={styles.statusOverlay}>
                    <Ionicons
                      name="refresh"
                      size={22}
                      color={Lister.color.surface}
                    />
                    <LText variant="caption" style={styles.errorText}>
                      Retry
                    </LText>
                  </View>
                ) : null}

                {photo.status === "ready" ? (
                  <View style={styles.readyDot} accessibilityLabel="Uploaded" />
                ) : null}
              </Pressable>

              <View style={styles.tileActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Move photo earlier"
                  disabled={index === 0}
                  onPress={() => movePhoto(photo.localId, -1)}
                  style={styles.iconBtn}
                >
                  <Ionicons
                    name="chevron-back"
                    size={16}
                    color={
                      index === 0 ? Lister.color.inkFaint : Lister.color.ink
                    }
                  />
                </Pressable>
                {index > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Make cover photo"
                    onPress={() => makeCover(photo.localId)}
                    style={styles.iconBtn}
                  >
                    <Ionicons
                      name="star-outline"
                      size={16}
                      color={Lister.color.primary}
                    />
                  </Pressable>
                ) : (
                  <View style={styles.iconBtn} />
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Move photo later"
                  disabled={index === photos.length - 1}
                  onPress={() => movePhoto(photo.localId, 1)}
                  style={styles.iconBtn}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={
                      index === photos.length - 1
                        ? Lister.color.inkFaint
                        : Lister.color.ink
                    }
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  onPress={() => removePhoto(photo.localId)}
                  style={styles.iconBtn}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={Lister.color.danger}
                  />
                </Pressable>
              </View>
            </TileEnter>
          </View>
        ))}

        {remaining > 0 ? (
          <View style={styles.cell}>
            <TileEnter index={photos.length}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add photos, ${remaining} slots remaining`}
                onPress={() => void pickPhotos()}
                style={styles.addTile}
              >
                <View style={styles.addIcon}>
                  <Ionicons
                    name="images-outline"
                    size={26}
                    color={Lister.color.primary}
                  />
                </View>
                <LText variant="caption" tone="primary" style={styles.addLabel}>
                  Add photos
                </LText>
                <LText variant="caption" tone="faint">
                  {remaining} left
                </LText>
              </Pressable>
            </TileEnter>
          </View>
        ) : null}
      </View>

      {readyCount < 1 ? (
        <LText variant="caption" tone="danger">
          Add at least 1 photo to publish.
        </LText>
      ) : (
        <LText variant="caption" tone="muted">
          {readyCount} ready · first image is your cover in the feed.
        </LText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  cell: {
    width: "47.5%",
    gap: 6,
  },
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
    backgroundColor: "rgba(20,36,30,0.06)",
  },
  coverBadge: {
    position: "absolute",
    top: 8,
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
    backgroundColor: "rgba(20,36,30,0.45)",
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
  tileActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
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
