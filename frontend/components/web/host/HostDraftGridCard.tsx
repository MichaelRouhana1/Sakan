import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { HostStatusPill } from "@/components/web/host/HostStatusPill";
import { Skoun } from "@/constants/theme";
import {
  checkpointCoverPhoto,
  checkpointDisplayTitle,
  checkpointLocationLine,
} from "@/features/listings/create/createDraftCheckpoint";
import type { DraftCheckpoint } from "@/features/listings/create/draft";

type Props = {
  checkpoint: DraftCheckpoint;
  onPress: () => void;
};

export function HostDraftGridCard({ checkpoint, onPress }: Props) {
  const cover = checkpointCoverPhoto(checkpoint);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.media}>
        {cover?.uri ? (
          <Image
            source={{ uri: cover.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={22} color={Skoun.color.inkFaint} />
          </View>
        )}
        <View style={styles.pillWrap}>
          <HostStatusPill label="In progress" tone="progress" />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {checkpointDisplayTitle(checkpoint)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {checkpointLocationLine(checkpoint)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    cursor: "pointer",
  },
  pressed: {
    opacity: 0.92,
  },
  media: {
    width: "100%",
    aspectRatio: 20 / 19,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
  },
  pillWrap: {
    position: "absolute",
    top: 8,
    left: 8,
  },
  body: {
    paddingTop: 8,
    gap: 2,
  },
  title: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
    lineHeight: 18,
  },
  subtitle: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
});
