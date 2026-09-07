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
    <View style={styles.wrap}>
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
  wrap: {
    gap: 10,
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    fontFamily: Skoun.type.bodyBold,
  },
  body: { lineHeight: 22 },
  more: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
});
