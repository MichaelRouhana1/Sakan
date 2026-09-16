import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { GeneralLoadingBlock } from "@/components/common/GeneralLoadingBlock";
import { BenefitHeroTicket } from "@/components/campus/BenefitHeroTicket";
import { BenefitRedeemPanel } from "@/components/campus/BenefitRedeemPanel";
import { BenefitRelated } from "@/components/campus/BenefitRelated";
import { LText } from "@/components/lister/Typography";
import { WebEmptyState } from "@/components/web/WebEmptyState";
import { Skoun } from "@/constants/theme";
import { WEB_NAV_HEIGHT } from "@/constants/webLayout";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { categoryMeta } from "@/features/benefits/categories";
import {
  REDEMPTION_META,
  hostOf,
  parseStepPath,
  splitFinePrint,
  splitSentences,
} from "@/features/benefits/detailCopy";
import {
  isCampusExclusive,
  type StudentBenefit,
} from "@/features/benefits/types";
import { useBenefit } from "@/features/benefits/useBenefit";
import { errorStatus } from "@/features/benefits/useBenefits";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Props = {
  id: string;
};

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const IS_WEB = Platform.OS === "web";
/** Page cap — narrower than the 1600 shell so margins stay modest, wider than a
 *  blog measure so the ticket and facts strip still feel like a full page. */
const PAGE_MAX = 1360;
/** Sticky redeem column; wide enough that the CTA and chips don't feel cramped. */
const SIDE_W = 420;

function PageScroll({ children }: { children: React.ReactNode }) {
  if (IS_WEB) {
    return <View style={styles.content}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      // iOS UIScrollView clips by default; side shadows need room inside
      // this box (vertical shadows already paint into the section gaps).
    >
      {children}
    </ScrollView>
  );
}

/** One orchestrated page-load: hero, facts, body, related — in that order. */
function useEnter(order: number) {
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      anim.setValue(1);
      return;
    }
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: Skoun.motion.enterMs,
      delay: order * Skoun.motion.staggerMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [anim, order, reduced]);

  return {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };
}

function shareUrlFor(id: string): string {
  if (IS_WEB && typeof window !== "undefined") return window.location.href;
  return `https://skoun.app/campus/benefits/${id}`;
}

function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <View style={styles.sectionHead}>
      <LText variant="label" style={styles.sectionNumber}>
        {n}
      </LText>
      <LText
        variant="title"
        accessibilityRole="header"
        aria-level={2}
        style={styles.sectionTitle}
      >
        {title}
      </LText>
      <View style={styles.sectionRule} />
    </View>
  );
}

function Fact({
  icon,
  label,
  value,
  index,
  count,
  half,
}: {
  icon: IconName;
  label: string;
  value: string;
  index: number;
  count: number;
  half: boolean;
}) {
  const divider = half ? index % 2 === 0 : index < count - 1;
  const rowRule = half && index < count - 2;
  return (
    <View
      style={[
        styles.fact,
        half ? styles.factHalf : styles.factQuarter,
        divider && styles.factDivider,
        rowRule && styles.factRowRule,
      ]}
    >
      <View style={styles.factLabelRow}>
        <Ionicons name={icon} size={13} color={Skoun.color.inkFaint} />
        <LText variant="label" tone="muted" style={styles.factLabel}>
          {label}
        </LText>
      </View>
      <LText variant="body" style={styles.factValue}>
        {value}
      </LText>
    </View>
  );
}

function QualifyItem({ sentence }: { sentence: string }) {
  const path = parseStepPath(sentence);
  return (
    <View style={styles.qualifyRow} accessibilityRole="text">
      <View style={styles.qualifyMark}>
        <Ionicons name="checkmark" size={13} color={Skoun.color.primary} />
      </View>
      {path ? (
        <View style={styles.pathWrap}>
          {path.prefix ? (
            <LText variant="body" style={styles.qualifyText}>
              {path.prefix}
            </LText>
          ) : null}
          <View
            style={styles.pathRow}
            accessibilityLabel={path.steps.join(", then ")}
          >
            {path.steps.map((step, i) => (
              <View key={`${step}-${i}`} style={styles.pathStepWrap}>
                <View style={styles.pathStep}>
                  <LText variant="caption" style={styles.pathStepText}>
                    {step}
                  </LText>
                </View>
                {i < path.steps.length - 1 ? (
                  <Ionicons
                    name="chevron-forward"
                    size={13}
                    color={Skoun.color.inkFaint}
                  />
                ) : null}
              </View>
            ))}
          </View>
          {path.suffix ? (
            <LText variant="caption" tone="muted" style={styles.pathSuffix}>
              {path.suffix.charAt(0).toUpperCase() + path.suffix.slice(1)}
            </LText>
          ) : null}
        </View>
      ) : (
        <LText variant="body" style={styles.qualifyText}>
          {sentence}
        </LText>
      )}
    </View>
  );
}

function CampusNotice({
  benefit,
  userUni,
}: {
  benefit: StudentBenefit;
  userUni: string;
}) {
  const router = useRouter();
  const unis = benefit.applicableUniversities;
  const included = unis.some(
    (u) => u.toLowerCase() === userUni.toLowerCase(),
  );

  if (included) {
    return (
      <View style={[styles.notice, styles.noticeOk]}>
        <Ionicons
          name="checkmark-circle"
          size={18}
          color={Skoun.color.primary}
        />
        <LText variant="body" style={styles.noticeText}>
          <LText variant="body" style={styles.noticeStrong}>
            You qualify.
          </LText>{" "}
          This offer is exclusive to {userUni} students.
        </LText>
      </View>
    );
  }

  return (
    <View style={[styles.notice, styles.noticeWarn]}>
      <Ionicons name="alert-circle" size={18} color={Skoun.color.warning} />
      <View style={styles.noticeCopy}>
        <LText variant="body" style={styles.noticeText}>
          <LText variant="body" style={styles.noticeStrong}>
            Exclusive to {unis.join(" · ")}.
          </LText>{" "}
          Your campus is {userUni}, so this one probably won&apos;t be honoured
          for you.
        </LText>
        <Pressable
          onPress={() =>
            router.push(
              `/campus/benefits?uni=${encodeURIComponent(userUni)}` as never,
            )
          }
          accessibilityRole="link"
          style={({ hovered }) => [
            styles.noticeLink,
            hovered && styles.noticeLinkHover,
          ]}
        >
          <LText variant="caption" style={styles.noticeLinkText}>
            See offers for {userUni}
          </LText>
          <Ionicons name="arrow-forward" size={13} color={Skoun.color.warning} />
        </Pressable>
      </View>
    </View>
  );
}

export function BenefitDetailPage({ id }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuthSession();
  const benefit = useBenefit(id);

  const wide = width >= 1000;
  const compact = width < 640;
  const stackTicket = width < 720;
  const relatedColumns: 1 | 2 | 3 = width >= 980 ? 3 : width >= 640 ? 2 : 1;

  const [linkCopied, setLinkCopied] = useState(false);
  useEffect(() => {
    if (!linkCopied) return;
    const t = setTimeout(() => setLinkCopied(false), 2000);
    return () => clearTimeout(t);
  }, [linkCopied]);

  const heroIn = useEnter(0);
  const factsIn = useEnter(1);
  const bodyIn = useEnter(2);
  const relatedIn = useEnter(3);

  const row = benefit.data;
  const copy = useMemo(
    () =>
      row
        ? {
            description: splitFinePrint(row.description),
            qualifies: splitSentences(row.eligibility),
          }
        : null,
    [row],
  );

  const backToList = () => router.push("/campus/benefits" as never);

  if (benefit.isLoading) {
    return (
      <GeneralLoadingBlock
        layout="page"
        state="working"
        label="Loading this offer…"
        style={styles.centered}
      />
    );
  }

  if (benefit.isError || !row || !copy) {
    const gone = errorStatus(benefit.error) === 404;
    return (
      <PageScroll>
        <WebEmptyState
          icon={gone ? "pricetag-outline" : "cloud-offline-outline"}
          title={
            gone ? "This offer is no longer available" : "Couldn't load this offer"
          }
          message={
            gone
              ? "It may have expired or been replaced by a newer partner deal."
              : "Check your connection and try again."
          }
          actionLabel={gone ? "Browse all benefits" : "Retry"}
          onAction={gone ? backToList : () => void benefit.refetch()}
        />
      </PageScroll>
    );
  }

  const meta = categoryMeta(row.category);
  const exclusive = isCampusExclusive(row);
  const redeemMeta = REDEMPTION_META[row.redemptionType];
  const userUni = user?.campus?.institutionShortName?.trim() || null;

  const shareLink = async () => {
    const url = shareUrlFor(row.id);
    try {
      if (IS_WEB) {
        await Clipboard.setStringAsync(url);
        setLinkCopied(true);
      } else {
        await Share.share({
          message: `${row.companyName} — ${row.title}\n${url}`,
          url,
        });
      }
    } catch {
      /* dismissed / unsupported */
    }
  };

  const openSource = () =>
    row.sourceUrl
      ? void Linking.openURL(row.sourceUrl).catch(() => undefined)
      : undefined;

  const facts = [
    {
      icon: "school-outline" as IconName,
      label: "Open to",
      value: exclusive
        ? row.applicableUniversities.join(" · ")
        : "Any accredited university",
    },
    {
      icon: (row.locationOrArea?.toLowerCase() === "online" ||
      (!row.locationOrArea && row.isGlobal)
        ? "globe-outline"
        : "location-outline") as IconName,
      label: "Where",
      value: row.locationOrArea ?? (row.isGlobal ? "Online" : "Lebanon"),
    },
    {
      icon: redeemMeta.icon,
      label: "Redeem with",
      value: redeemMeta.label,
    },
    {
      icon: "shield-checkmark-outline" as IconName,
      label: "Source",
      value: row.sourceUrl ? hostOf(row.sourceUrl) : "Partner listing",
    },
  ];

  const redeemPanel = <BenefitRedeemPanel benefit={row} />;

  const sourceCard = row.sourceUrl ? (
    <View style={styles.source}>
      <View style={styles.sourceIcon}>
        <Ionicons
          name="shield-checkmark-outline"
          size={18}
          color={Skoun.color.primary}
        />
      </View>
      <View style={styles.sourceCopy}>
        <LText variant="subtitle" style={styles.sourceTitle}>
          Listed from {hostOf(row.sourceUrl)}
        </LText>
        <LText variant="caption" tone="muted" style={styles.sourceBody}>
          Skoun only lists offers documented by the partner or the university.
          Terms can change on their side — check the source before you rely on
          it.
        </LText>
        <Pressable
          onPress={openSource}
          accessibilityRole="link"
          accessibilityLabel={`Open the source on ${hostOf(row.sourceUrl)}`}
          style={({ hovered }) => [
            styles.sourceLink,
            hovered && styles.sourceLinkHover,
          ]}
        >
          <LText variant="caption" style={styles.sourceLinkText}>
            Open the source
          </LText>
          <Ionicons name="open-outline" size={13} color={Skoun.color.primary} />
        </Pressable>
      </View>
    </View>
  ) : null;

  return (
    <PageScroll>
      <View style={[styles.page, compact && styles.pageCompact]}>
        {/* Breadcrumb + share */}
        <Animated.View style={[styles.topbar, heroIn]}>
          <View style={styles.crumbs}>
            <Pressable
              onPress={backToList}
              accessibilityRole="link"
              accessibilityLabel="Back to all benefits"
              style={styles.crumb}
            >
              {({ hovered }) => (
                <>
                  <Ionicons name="arrow-back" size={15} color={Skoun.color.primary} />
                  <LText
                    variant="caption"
                    style={[styles.crumbText, hovered && styles.crumbTextHover]}
                  >
                    All benefits
                  </LText>
                </>
              )}
            </Pressable>
            <Ionicons
              name="chevron-forward"
              size={13}
              color={Skoun.color.inkFaint}
            />
            <Pressable
              onPress={() =>
                router.push(`/campus/benefits?cat=${row.category}` as never)
              }
              accessibilityRole="link"
              accessibilityLabel={`Browse ${meta.label} offers`}
              style={styles.crumb}
            >
              {({ hovered }) => (
                <LText
                  variant="caption"
                  style={[styles.crumbText, hovered && styles.crumbTextHover]}
                >
                  {meta.label}
                </LText>
              )}
            </Pressable>
            {!compact ? (
              <>
                <Ionicons
                  name="chevron-forward"
                  size={13}
                  color={Skoun.color.inkFaint}
                />
                <LText
                  variant="caption"
                  tone="muted"
                  style={styles.crumbCurrent}
                  numberOfLines={1}
                >
                  {row.companyName}
                </LText>
              </>
            ) : null}
          </View>

          <Pressable
            onPress={() => void shareLink()}
            accessibilityRole="button"
            accessibilityLabel={IS_WEB ? "Copy link to this offer" : "Share this offer"}
            style={styles.shareBtn}
          >
            {({ hovered }) => (
              <>
                <Ionicons
                  name={
                    linkCopied
                      ? "checkmark"
                      : IS_WEB
                        ? "link-outline"
                        : "share-outline"
                  }
                  size={15}
                  color={Skoun.color.primary}
                />
                <LText
                  variant="caption"
                  style={[styles.shareText, hovered && styles.shareTextHover]}
                >
                  {linkCopied ? "Link copied" : IS_WEB ? "Copy link" : "Share"}
                </LText>
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Two columns from the ticket down: the ticket, facts and sections
            share the text column's width; the redeem panel starts level with
            the ticket instead of below the facts strip. */}
        <View style={[styles.columns, wide && styles.columnsWide]}>
          <View style={styles.mainCol}>
            <Animated.View style={heroIn}>
              <BenefitHeroTicket
                benefit={row}
                stack={stackTicket}
                compact={compact}
              />
            </Animated.View>

            <Animated.View style={[styles.factsBlock, factsIn]}>
              {exclusive && userUni ? (
                <CampusNotice benefit={row} userUni={userUni} />
              ) : null}
              <View style={[styles.facts, compact && styles.factsWrap]}>
                {facts.map((f, i) => (
                  <Fact
                    key={f.label}
                    icon={f.icon}
                    label={f.label}
                    value={f.value}
                    index={i}
                    count={facts.length}
                    half={compact}
                  />
                ))}
              </View>
            </Animated.View>

            {!wide ? (
              <Animated.View style={[styles.sideCol, bodyIn]}>
                {redeemPanel}
              </Animated.View>
            ) : null}

            <Animated.View style={[styles.sections, bodyIn]}>
            <View style={styles.section}>
              <SectionHead n="01" title="What you get" />
              <LText variant="body" style={styles.prose}>
                {copy.description.lead.join(" ")}
              </LText>
            </View>

            <View style={styles.section}>
              <SectionHead n="02" title="Who qualifies" />
              <View style={styles.qualifyList}>
                {copy.qualifies.map((sentence, i) => (
                  <QualifyItem key={`${i}-${sentence.slice(0, 24)}`} sentence={sentence} />
                ))}
              </View>
            </View>

            {copy.description.notes.length > 0 ? (
              <View style={styles.section}>
                <SectionHead n="03" title="Good to know" />
                <View style={styles.notes}>
                  {copy.description.notes.map((note, i) => (
                    <View key={`${i}-${note.slice(0, 24)}`} style={styles.noteRow}>
                      <Ionicons
                        name="information-circle-outline"
                        size={17}
                        color={Skoun.color.inkMuted}
                        style={styles.noteIcon}
                      />
                      <LText variant="body" style={styles.noteText}>
                        {note}
                      </LText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {sourceCard}
            </Animated.View>
          </View>

          {wide ? (
            <Animated.View style={[styles.sideCol, styles.sideColWide, factsIn]}>
              {redeemPanel}
            </Animated.View>
          ) : null}
        </View>

        <Animated.View style={relatedIn}>
          <BenefitRelated current={row} columns={relatedColumns} />
        </Animated.View>
      </View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingBottom: 64,
    // Native ScrollView clips overflow. Tickets are width 100%, so a
    // downward shadow still shows in the gaps, but left/right gets cut.
    ...(IS_WEB ? null : { paddingHorizontal: 20 }),
  },
  centered: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  page: {
    gap: 28,
    width: "100%",
    maxWidth: PAGE_MAX,
    alignSelf: "center",
    paddingTop: 4,
  },
  pageCompact: {
    gap: 22,
  },

  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 40,
  },
  crumbs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  crumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 2,
    minHeight: 40,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  crumbText: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  crumbTextHover: {
    textDecorationLine: "underline",
    textDecorationColor: Skoun.color.primary,
  },
  crumbCurrent: {
    fontFamily: Skoun.type.bodyMedium,
    flexShrink: 1,
    marginLeft: 4,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 2,
    minHeight: 40,
    flexShrink: 0,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  shareText: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  shareTextHover: {
    textDecorationLine: "underline",
    textDecorationColor: Skoun.color.primary,
  },

  factsBlock: {
    gap: 16,
  },
  facts: {
    flexDirection: "row",
    alignItems: "stretch",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  factsWrap: {
    flexWrap: "wrap",
    rowGap: 0,
  },
  fact: {
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 18,
    minWidth: 0,
  },
  factQuarter: {
    flex: 1,
  },
  factHalf: {
    flexBasis: "50%",
    flexGrow: 1,
  },
  factDivider: {
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  factRowRule: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  factLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  factLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  factValue: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    lineHeight: 21,
  },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Skoun.radius.md,
    borderWidth: 1,
  },
  noticeOk: {
    backgroundColor: Skoun.color.primaryMist,
    borderColor: "#C5D6F5",
  },
  noticeWarn: {
    backgroundColor: Skoun.color.warningSoft,
    borderColor: "#F5DFA3",
  },
  noticeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  noticeText: {
    flex: 1,
    minWidth: 0,
    color: Skoun.color.ink,
    lineHeight: 22,
  },
  noticeStrong: {
    fontFamily: Skoun.type.bodyBold,
    color: Skoun.color.ink,
  },
  noticeLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    minHeight: 32,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  noticeLinkHover: {
    opacity: 0.7,
  },
  noticeLinkText: {
    color: Skoun.color.warning,
    fontFamily: Skoun.type.bodySemi,
  },

  columns: {
    gap: 28,
    width: "100%",
    overflow: "visible",
  },
  // Text column keeps a reading measure; the panel pins to the right edge so
  // any slack sits between them rather than at the page margins.
  columnsWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 64,
  },
  mainCol: {
    flex: 1,
    minWidth: 0,
    gap: 28,
    overflow: "visible",
  },
  sections: {
    gap: 36,
  },
  sideCol: {
    width: "100%",
    overflow: "visible",
  },
  sideColWide: {
    width: SIDE_W,
    flexShrink: 0,
    ...(IS_WEB
      ? ({ position: "sticky", top: WEB_NAV_HEIGHT + 24 } as object)
      : null),
  },

  section: {
    gap: 14,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionNumber: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodyBold,
    letterSpacing: 1,
    fontSize: 12,
  },
  sectionTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: Skoun.color.ink,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
    marginLeft: 4,
  },
  prose: {
    fontSize: 17,
    lineHeight: 28,
    color: Skoun.color.ink,
  },

  qualifyList: {
    gap: 12,
  },
  qualifyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  qualifyMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginTop: 1,
    backgroundColor: Skoun.color.primaryMist,
    borderWidth: 1,
    borderColor: "#C5D6F5",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  qualifyText: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 26,
    color: Skoun.color.ink,
  },
  pathWrap: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  pathRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: 6,
  },
  pathStepWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 4,
  },
  pathStep: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Skoun.radius.sm,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  pathStepText: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodySemi,
  },
  pathSuffix: {
    lineHeight: 19,
  },

  notes: {
    gap: 10,
    padding: 16,
    borderRadius: Skoun.radius.md,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  noteIcon: {
    marginTop: 3,
  },
  noteText: {
    flex: 1,
    minWidth: 0,
    color: Skoun.color.ink,
    lineHeight: 23,
  },

  source: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 18,
    borderRadius: Skoun.radius.lg,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  sourceIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Skoun.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sourceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  sourceTitle: {
    fontFamily: Skoun.type.bodyBold,
    color: Skoun.color.ink,
    fontSize: 16,
  },
  sourceBody: {
    lineHeight: 19,
  },
  sourceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginTop: 6,
    minHeight: 32,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  sourceLinkHover: {
    opacity: 0.7,
  },
  sourceLinkText: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
});
