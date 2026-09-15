import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import {
  BenefitCard,
  BenefitCardSkeleton,
} from "@/components/campus/BenefitCard";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { categoryMeta } from "@/features/benefits/categories";
import {
  isCampusExclusive,
  type StudentBenefit,
} from "@/features/benefits/types";
import { useBenefits } from "@/features/benefits/useBenefits";

type Props = {
  current: StudentBenefit;
  columns: 1 | 2 | 3 | 4;
};

const MAX_RELATED = 4;

/**
 * Same-category offers, ranked so a USJ-only deal surfaces other USJ deals
 * first and an open offer surfaces other open offers first.
 */
function rankRelated(
  rows: StudentBenefit[],
  current: StudentBenefit,
  limit: number,
): StudentBenefit[] {
  const currentExclusive = isCampusExclusive(current);
  const shared = (row: StudentBenefit) =>
    row.applicableUniversities.some((u) =>
      current.applicableUniversities.includes(u),
    );

  return rows
    .filter((row) => row.id !== current.id)
    .map((row) => {
      let score = 0;
      if (isCampusExclusive(row) === currentExclusive) score += 2;
      if (currentExclusive && shared(row)) score += 3;
      if (row.isGlobal === current.isGlobal) score += 1;
      return { row, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.row);
}

export function BenefitRelated({ current, columns }: Props) {
  const router = useRouter();
  const meta = categoryMeta(current.category);
  const query = useBenefits({ category: current.category });

  // Fill exactly one row on 3/4-column grids; two rows of two on tablets.
  const limit = columns === 3 ? 3 : Math.min(MAX_RELATED, columns * 2);
  const related = useMemo(
    () => rankRelated(query.data ?? [], current, limit),
    [query.data, current, limit],
  );

  if (!query.isLoading && related.length === 0) return null;

  const browse = () =>
    router.push(`/campus/benefits?cat=${current.category}` as never);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <LText variant="label" tone="muted" style={styles.kicker}>
            Keep browsing
          </LText>
          <LText variant="title" style={styles.title}>
            More {meta.label.toLowerCase()} perks
          </LText>
        </View>
        <Pressable
          onPress={browse}
          accessibilityRole="link"
          accessibilityLabel={`Browse all ${meta.label} offers`}
          style={({ hovered }) => [
            styles.browse,
            hovered && styles.browseHover,
          ]}
        >
          <LText variant="caption" style={styles.browseText}>
            Browse all {meta.label.toLowerCase()}
          </LText>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={Skoun.color.primary}
          />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {query.isLoading
          ? Array.from({ length: Math.min(limit, columns) }, (_, i) => (
              <View
                key={i}
                style={[styles.cell, { flexBasis: `${100 / columns}%` }]}
              >
                <BenefitCardSkeleton />
              </View>
            ))
          : related.map((row, i) => (
              <View
                key={row.id}
                style={[styles.cell, { flexBasis: `${100 / columns}%` }]}
              >
                <BenefitCard
                  benefit={row}
                  index={i}
                  onPress={(id) =>
                    router.push(`/campus/benefits/${id}` as never)
                  }
                />
              </View>
            ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
    width: "100%",
    marginTop: 8,
    paddingTop: 28,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flexWrap: "wrap",
    columnGap: 16,
    rowGap: 8,
  },
  headCopy: {
    gap: 2,
  },
  kicker: {
    letterSpacing: 0.8,
    fontSize: 11,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  browse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 4,
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          transitionProperty: "opacity",
          transitionDuration: "160ms",
        } as object)
      : null),
  },
  browseHover: {
    opacity: 0.72,
  },
  browseText: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: Platform.OS === "web" ? -6 : 0,
    rowGap: 14,
    width: "100%",
    overflow: "visible",
  },
  cell: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 6,
    alignSelf: "stretch",
    minWidth: 0,
    maxWidth: "100%",
    overflow: "visible",
  },
});
