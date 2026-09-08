import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import {
  listingDetailChrome as chrome,
  type ListingDetailVariant,
} from "@/components/listings/detail/listingDetailChrome";

type Props = {
  description: string;
  variant?: ListingDetailVariant;
};

const PREVIEW = 180;

export function ListingDetailAbout({
  description,
  variant = "card",
}: Props) {
  const [open, setOpen] = useState(false);
  const long = description.length > PREVIEW;
  const body =
    !open && long ? `${description.slice(0, PREVIEW).trim()}…` : description;
  const web = variant === "web";

  return (
    <View style={[web ? chrome.web : chrome.card, styles.gap]}>
      <LText variant="title" style={web ? chrome.webHeading : chrome.cardHeading}>
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
  gap: { gap: 10 },
  body: { lineHeight: 22 },
  more: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
});
