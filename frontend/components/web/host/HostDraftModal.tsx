import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Skoun } from "@/constants/theme";
import { openCreateListing, openWorkingCreateListing } from "@/features/auth/useEnsureSession";
import {
  checkpointCoverPhoto,
  checkpointDisplayTitle,
  clearMainCheckpoint,
  clearWorkingCheckpoint,
} from "@/features/listings/create/createDraftCheckpoint";
import type { DraftCheckpoint, DraftSlot } from "@/features/listings/create/draft";
import { useArchiveListing } from "@/features/listings/useArchiveListing";
import type { Listing } from "@/types/listing";

export type DraftModalTarget =
  | { kind: "local"; checkpoint: DraftCheckpoint; slot: DraftSlot }
  | { kind: "server"; listing: Listing };

type Props = {
  target: DraftModalTarget | null;
  onClose: () => void;
  onRemoved: () => void;
};

function targetTitle(target: DraftModalTarget): string {
  if (target.kind === "local") {
    return checkpointDisplayTitle(target.checkpoint);
  }
  return (
    target.listing.title?.trim() ||
    `Your listing started ${new Date(target.listing.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`
  );
}

function targetLocation(target: DraftModalTarget): string {
  if (target.kind === "local") {
    const area = target.checkpoint.draft.area;
    return area ?? "Lebanon";
  }
  return target.listing.area;
}

function targetCover(target: DraftModalTarget): string | null {
  if (target.kind === "local") {
    return checkpointCoverPhoto(target.checkpoint)?.uri ?? null;
  }
  return target.listing.coverUrl ?? target.listing.photos[0]?.url ?? null;
}

export function HostDraftModal({ target, onClose, onRemoved }: Props) {
  const router = useRouter();
  const archive = useArchiveListing();
  const [removing, setRemoving] = useState(false);

  const visible = target != null;

  async function handleRemove() {
    if (!target || removing) return;
    setRemoving(true);
    try {
      if (target.kind === "local") {
        if (target.slot === "working") {
          await clearWorkingCheckpoint();
        } else {
          await clearMainCheckpoint();
        }
      } else {
        await archive.mutateAsync(target.listing.id);
      }
      onRemoved();
      onClose();
    } finally {
      setRemoving(false);
    }
  }

  function handleEdit() {
    if (!target) return;
    onClose();
    if (target.kind === "local") {
      if (target.slot === "working") {
        openWorkingCreateListing(router);
      } else {
        openCreateListing(router);
      }
      return;
    }
    router.push({
      pathname: "/(poster)/listing/[id]",
      params: { id: target.listing.id },
    });
  }

  if (!target) return null;

  const cover = targetCover(target);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={18} color={Skoun.color.ink} />
          </Pressable>

          <View style={styles.media}>
            {cover ? (
              <Image
                source={{ uri: cover }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.mediaPlaceholder}>
                <Ionicons name="image-outline" size={32} color={Skoun.color.inkFaint} />
              </View>
            )}
          </View>

          <Text style={styles.title}>{targetTitle(target)}</Text>
          <Text style={styles.location}>{targetLocation(target)}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={handleEdit}
            style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
          >
            <Text style={styles.editBtnText}>Edit listing</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => void handleRemove()}
            disabled={removing}
            style={({ pressed }) => [
              styles.removeBtn,
              pressed && styles.removeBtnPressed,
              removing && styles.removeBtnDisabled,
            ]}
          >
            {removing ? (
              <ActivityIndicator color={Skoun.color.ink} size="small" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color={Skoun.color.ink} />
                <Text style={styles.removeBtnText}>Remove listing</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: "center",
    zIndex: 1,
    boxShadow: "0 24px 48px rgba(0,0,0,0.18)" as unknown as undefined,
  },
  closeBtn: {
    alignSelf: "flex-start",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    cursor: "pointer",
  },
  media: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 280,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    marginBottom: 20,
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
  },
  title: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 16,
    color: Skoun.color.ink,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 6,
  },
  location: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.inkMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  editBtn: {
    width: "100%",
    backgroundColor: Skoun.color.ink,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
    cursor: "pointer",
  },
  editBtnPressed: {
    opacity: 0.9,
  },
  editBtnText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: "#FFFFFF",
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    cursor: "pointer",
  },
  removeBtnPressed: {
    opacity: 0.75,
  },
  removeBtnDisabled: {
    opacity: 0.5,
  },
  removeBtnText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
    textDecorationLine: "underline",
  },
});
