import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";

type Props = {
  description: string;
};

const PREVIEW = 180;

export function ListingDetailAbout({ description }: Props) {
  const [open, setOpen] = useState(false);
  const long = description.length > PREVIEW;
  const body =
    !open && long ? `${description.slice(0, PREVIEW).trim()}…` : description;

  return (
    <View style={styles.card}>
      <LText variant="title" style={styles.heading}>
        About the property
      </LText>
      <LText variant="body" tone="muted" style={styles.body}>
        {body}
      </LText>
      {long ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen((v) => !v)}
        >
          <LText variant="caption" style={styles.more}>
            {open ? "Show less" : "Show more"}
          </LText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.lg,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  heading: { fontSize: 18 },
  body: { lineHeight: 22 },
  more: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
});
