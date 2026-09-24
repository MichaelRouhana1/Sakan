import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Skoun } from "@/constants/theme";
import type { ListingMoreMenuProps } from "@/components/listings/detail/ListingMoreMenu.types";

/** Native fallback — `liquid-gooey` is web-only. */
export function ListingMoreMenu({
  linkCopied,
  reported,
  onShare,
  onReport,
  canReport = true,
}: ListingMoreMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.row}>
      {open ? (
        <>
          <Pressable
            onPress={() => {
              onShare();
            }}
            accessibilityRole="button"
            accessibilityLabel={linkCopied ? "Link copied" : "Copy link"}
            style={styles.iconBtn}
          >
            <Ionicons
              name={linkCopied ? "checkmark" : "link-outline"}
              size={16}
              color={Skoun.color.ink}
            />
          </Pressable>
          {reported || !canReport ? null : (
            <Pressable
              onPress={() => {
                onReport();
              }}
              accessibilityRole="button"
              accessibilityLabel="Report this listing"
              style={styles.iconBtn}
            >
              <Ionicons name="flag-outline" size={16} color={Skoun.color.ink} />
            </Pressable>
          )}
        </>
      ) : null}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={open ? "Close listing actions" : "More listing actions"}
        accessibilityState={{ expanded: open }}
        style={styles.iconBtn}
      >
        <Ionicons
          name={open ? "close" : "ellipsis-horizontal"}
          size={16}
          color={Skoun.color.ink}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    flexShrink: 0,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#D9E0EA",
    alignItems: "center",
    justifyContent: "center",
  },
});
