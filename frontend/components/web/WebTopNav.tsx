import { Link, usePathname, useRouter } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { DownloadAppButton } from "@/components/web/DownloadAppButton";
import { SkounLogo } from "@/components/common/SkounLogo";
import { Skoun } from "@/constants/theme";
import {
  WEB_CONTENT_MAX,
  WEB_CONTENT_PAD_X,
  WEB_NAV_HEIGHT,
} from "@/constants/webLayout";

type Props = {
  showSearch?: boolean;
};

/** Link asChild + style arrays crash RN-web (CSSStyleDeclaration [0]). */
function flattenViewStyle(
  style: StyleProp<ViewStyle>,
): ViewStyle | undefined {
  return StyleSheet.flatten(style) as ViewStyle | undefined;
}

export function WebTopNav({ showSearch = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const findActive =
    pathname === "/search" ||
    pathname.startsWith("/search/") ||
    (pathname.includes("/(renter)") &&
      !pathname.includes("/saved") &&
      !pathname.includes("/listing/"));
  const savedActive = pathname.includes("/saved");

  return (
    <View style={styles.bar}>
      <View style={[styles.inner, showSearch && styles.innerSearch]}>
        <Link href="/" asChild>
          <Pressable
            onPress={() => router.push("/")}
            accessibilityRole="link"
            style={styles.brandHit}
          >
            <SkounLogo size={32} />
            <Text style={styles.brand}>Skoun</Text>
          </Pressable>
        </Link>

        {showSearch ? (
          <View style={styles.searchWrap}>
            <TextInput
              placeholder="Search by city, area, university, or listing"
              placeholderTextColor={Skoun.color.inkMuted}
              style={styles.searchInput}
              editable={false}
              onPressIn={() => router.push("/search")}
              accessibilityLabel="Search listings"
            />
            <View style={styles.searchBtn} accessibilityElementsHidden>
              <Text style={styles.searchBtnGlyph}>⌕</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.links}>
          <DownloadAppButton />
          <Link href="/search" asChild>
            <Pressable
              style={flattenViewStyle([
                styles.link,
                findActive && styles.linkActive,
              ])}
              accessibilityRole="link"
            >
              <Text
                style={[styles.linkText, findActive && styles.linkTextActive]}
              >
                Find
              </Text>
            </Pressable>
          </Link>
          <Link href="/saved" asChild>
            <Pressable
              style={flattenViewStyle([
                styles.link,
                savedActive && styles.linkActive,
              ])}
              accessibilityRole="link"
            >
              <Text
                style={[styles.linkText, savedActive && styles.linkTextActive]}
              >
                Saved
              </Text>
            </Pressable>
          </Link>
          <Link href="/(poster)/(tabs)/create" asChild>
            <Pressable style={styles.cta} accessibilityRole="link">
              <Text style={styles.ctaText}>List a room</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "sticky" as unknown as "relative",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    maxWidth: "100%",
    height: WEB_NAV_HEIGHT,
    minHeight: WEB_NAV_HEIGHT,
    zIndex: 50,
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    boxSizing: "border-box",
  },
  inner: {
    maxWidth: WEB_CONTENT_MAX,
    width: "100%",
    minHeight: WEB_NAV_HEIGHT,
    marginHorizontal: "auto" as unknown as number,
    alignSelf: "center",
    paddingHorizontal: WEB_CONTENT_PAD_X,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    boxSizing: "border-box",
  },
  innerSearch: {
    justifyContent: "flex-start",
  },
  brandHit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingRight: 8,
  },
  brand: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 22,
    color: Skoun.color.primary,
    letterSpacing: -0.6,
  },
  searchWrap: {
    flex: 1,
    maxWidth: 520,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: 999,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.ink,
    paddingVertical: 8,
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnGlyph: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: Skoun.type.bodyBold,
  },
  links: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
    flexShrink: 0,
  },
  link: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Skoun.radius.sm,
  },
  linkActive: {
    backgroundColor: Skoun.color.primaryMist,
  },
  linkText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 14,
    color: Skoun.color.inkMuted,
  },
  linkTextActive: {
    color: Skoun.color.ink,
  },
  cta: {
    marginLeft: 8,
    backgroundColor: Skoun.color.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Skoun.radius.sm,
  },
  ctaText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
