import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { BenefitRedeemPanel } from "@/components/campus/BenefitRedeemPanel";
import { LText } from "@/components/lister/Typography";
import { WebEmptyState } from "@/components/web/WebEmptyState";
import { Skoun } from "@/constants/theme";
import { categoryMeta } from "@/features/benefits/categories";
import { isCampusExclusive } from "@/features/benefits/types";
import { useBenefit } from "@/features/benefits/useBenefit";
import { errorStatus } from "@/features/benefits/useBenefits";

type Props = {
  id: string;
};

function hostOf(url: string): string {
  const match = /^https?:\/\/([^/]+)/i.exec(url);
  return match?.[1]?.replace(/^www\./, "") ?? "source";
}

export function BenefitDetailPage({ id }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const benefit = useBenefit(id);
  const wide = width >= 1000;

  const backToList = () => router.push("/campus/benefits" as never);

  if (benefit.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Skoun.color.primary} />
      </View>
    );
  }

  if (benefit.isError || !benefit.data) {
    const gone = errorStatus(benefit.error) === 404;
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <WebEmptyState
          icon={gone ? "pricetag-outline" : "cloud-offline-outline"}
          title={gone ? "This offer is no longer available" : "Couldn't load this offer"}
          message={
            gone
              ? "It may have expired or been replaced by a newer partner deal."
              : "Check your connection and try again."
          }
          actionLabel={gone ? "Browse all benefits" : "Retry"}
          onAction={gone ? backToList : () => void benefit.refetch()}
        />
      </ScrollView>
    );
  }

  const row = benefit.data;
  const meta = categoryMeta(row.category);
  const exclusive = isCampusExclusive(row);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.page}>
        <Pressable
          onPress={backToList}
          accessibilityRole="link"
          accessibilityLabel="Back to all benefits"
          style={({ hovered }) => [styles.back, hovered && styles.backHover]}
        >
          <Ionicons name="arrow-back" size={16} color={Skoun.color.primary} />
          <LText variant="caption" style={styles.backLabel}>
            All benefits
          </LText>
        </Pressable>

        <View style={styles.header}>
          <View style={[styles.iconWell, { backgroundColor: meta.tint }]}>
            <Ionicons name={meta.icon} size={26} color={meta.accent} />
          </View>
          <View style={styles.headerCopy}>
            <LText
              variant="label"
              style={[styles.company, { color: meta.accent }]}
            >
              {row.companyName}
            </LText>
            <LText variant="display" style={styles.title}>
              {row.title}
            </LText>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: meta.tint, borderColor: meta.tint }]}>
            <Ionicons name={meta.icon} size={12} color={meta.accent} />
            <LText variant="caption" style={[styles.badgeText, { color: meta.accent }]}>
              {meta.label}
            </LText>
          </View>
          <View style={styles.badge}>
            <Ionicons
              name={row.isGlobal ? "globe-outline" : "flag-outline"}
              size={12}
              color={Skoun.color.inkMuted}
            />
            <LText variant="caption" style={styles.badgeText}>
              {row.isGlobal ? "Global offer" : "Lebanon"}
            </LText>
          </View>
          {row.locationOrArea ? (
            <View style={styles.badge}>
              <Ionicons
                name="location-outline"
                size={12}
                color={Skoun.color.inkMuted}
              />
              <LText variant="caption" style={styles.badgeText}>
                {row.locationOrArea}
              </LText>
            </View>
          ) : null}
        </View>

        <View style={[styles.columns, wide && styles.columnsWide]}>
          <View style={styles.mainCol}>
            <View style={styles.block}>
              <LText variant="label" tone="muted" style={styles.blockLabel}>
                What you get
              </LText>
              <LText variant="body" style={styles.blockBody}>
                {row.description}
              </LText>
            </View>

            <View style={styles.block}>
              <LText variant="label" tone="muted" style={styles.blockLabel}>
                Who qualifies
              </LText>
              <LText variant="body" style={styles.blockBody}>
                {row.eligibility}
              </LText>
            </View>

            <View style={styles.block}>
              <LText variant="label" tone="muted" style={styles.blockLabel}>
                {exclusive ? "Exclusive to" : "Open to"}
              </LText>
              <View style={styles.uniRow}>
                {exclusive ? (
                  row.applicableUniversities.map((uni) => (
                    <View key={uni} style={[styles.badge, styles.badgeUni]}>
                      <Ionicons
                        name="school-outline"
                        size={12}
                        color={Skoun.color.primary}
                      />
                      <LText variant="caption" style={styles.badgeTextUni}>
                        {uni}
                      </LText>
                    </View>
                  ))
                ) : (
                  <View style={[styles.badge, styles.badgeUni]}>
                    <Ionicons
                      name="school-outline"
                      size={12}
                      color={Skoun.color.primary}
                    />
                    <LText variant="caption" style={styles.badgeTextUni}>
                      Any accredited university in Lebanon
                    </LText>
                  </View>
                )}
              </View>
            </View>

            {row.sourceUrl ? (
              <Pressable
                onPress={() =>
                  void Linking.openURL(row.sourceUrl as string).catch(
                    () => undefined,
                  )
                }
                accessibilityRole="link"
                accessibilityLabel={`Verify this offer on ${hostOf(row.sourceUrl)}`}
                style={({ hovered }) => [
                  styles.source,
                  hovered && styles.sourceHover,
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={Skoun.color.inkMuted}
                />
                <LText variant="caption" tone="muted" style={styles.sourceText}>
                  Verify on {hostOf(row.sourceUrl)}
                </LText>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.sideCol, wide && styles.sideColWide]}>
            <BenefitRedeemPanel benefit={row} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingBottom: 64,
  },
  centered: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  page: {
    gap: 20,
    width: "100%",
    maxWidth: 1040,
    alignSelf: "center",
    paddingTop: 8,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: -10,
    borderRadius: Skoun.radius.pill,
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          transitionProperty: "background-color",
          transitionDuration: "180ms",
        } as object)
      : null),
  },
  backHover: {
    backgroundColor: Skoun.color.primaryMist,
  },
  backLabel: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  company: {
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Skoun.radius.pill,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  badgeUni: {
    backgroundColor: Skoun.color.primaryMist,
    borderColor: "#C5D6F5",
  },
  badgeText: {
    color: Skoun.color.inkMuted,
    fontFamily: Skoun.type.bodyMedium,
  },
  badgeTextUni: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  columns: {
    gap: 24,
    width: "100%",
  },
  columnsWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  mainCol: {
    flex: 1,
    minWidth: 0,
    gap: 20,
  },
  sideCol: {
    width: "100%",
  },
  sideColWide: {
    width: 380,
    flexShrink: 0,
    ...(Platform.OS === "web"
      ? ({ position: "sticky", top: 96 } as object)
      : null),
  },
  block: {
    gap: 6,
  },
  blockLabel: {
    letterSpacing: 0.4,
  },
  blockBody: {
    fontSize: 16,
    lineHeight: 25,
    color: Skoun.color.ink,
  },
  uniRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  source: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Skoun.radius.md,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surfaceMuted,
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          transitionProperty: "border-color, background-color",
          transitionDuration: "180ms",
        } as object)
      : null),
  },
  sourceHover: {
    borderColor: Skoun.color.borderStrong,
    backgroundColor: Skoun.color.surface,
  },
  sourceText: {
    fontFamily: Skoun.type.bodyMedium,
  },
});
