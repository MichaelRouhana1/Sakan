import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Skoun } from "@/constants/theme";

export type AnalyticsCardIcon = keyof typeof Ionicons.glyphMap;

type Tone = "default" | "warning";

type Props = {
  label: string;
  value: string;
  tone?: Tone;
  compact?: boolean;
  /** Tighter vertical padding; overview totals stay on the default card. */
  dense?: boolean;
  /** Stretch to a parent slot without stealing overview flex-wrap. */
  fill?: boolean;
  /** Clear glass pane. */
  glass?: boolean;
  /** Shown from the info mark beside the label. */
  hint?: string;
  /** Outline mark beside the label. Decorative; the label stays the name. */
  icon?: AnalyticsCardIcon;
};

const web = Platform.OS === "web";

/** Clear architectural pane. Kept as a plain object so RN-web does not strip CSS. */
const WEB_GLASS = {
  backgroundColor: "rgba(255,255,255,0.22)",
  borderColor: "rgba(255,255,255,0.78)",
  backdropFilter: "blur(24px) saturate(1.8)",
  WebkitBackdropFilter: "blur(24px) saturate(1.8)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.95), inset 1px 0 0 rgba(255,255,255,0.4), inset 0 -28px 40px rgba(47,111,237,0.07), 0 0 0 1px rgba(47,111,237,0.14), 0 20px 44px rgba(18,24,38,0.09)",
} as object;

const WEB_GLASS_WARNING = {
  backgroundColor: "rgba(254,243,199,0.28)",
  borderColor: "rgba(255,248,225,0.86)",
  backdropFilter: "blur(24px) saturate(1.6)",
  WebkitBackdropFilter: "blur(24px) saturate(1.6)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -24px 36px rgba(180,83,9,0.08), 0 0 0 1px rgba(180,83,9,0.14), 0 20px 44px rgba(180,83,9,0.09)",
} as object;

const WEB_SHEEN = {
  backgroundImage:
    "linear-gradient(165deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.16) 38%, rgba(255,255,255,0) 70%)",
} as object;

export function HostAnalyticsGlassPane({
  children,
  style,
  contentStyle,
  warning = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  warning?: boolean;
}) {
  return (
    <View
      style={[
        styles.glassPane,
        style,
        !web && warning ? styles.glassPaneWarningNative : null,
        web ? (warning ? WEB_GLASS_WARNING : WEB_GLASS) : null,
      ]}
    >
      {web ? (
        <View pointerEvents="none" style={styles.glassSheenClip}>
          <View style={[styles.glassSheen, WEB_SHEEN]} />
          <View style={styles.glassRim} />
        </View>
      ) : null}
      <View style={[styles.glassBody, contentStyle]}>{children}</View>
    </View>
  );
}

export function AnalyticsCardIconMark({
  name,
  warning = false,
}: {
  name: AnalyticsCardIcon;
  warning?: boolean;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.iconMark}
    >
      <Ionicons
        name={name}
        size={20}
        color={warning ? Skoun.color.warning : Skoun.color.primary}
      />
    </View>
  );
}

function InfoHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.hintWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        onHoverIn={web ? () => setOpen(true) : undefined}
        onHoverOut={web ? () => setOpen(false) : undefined}
        onPress={web ? undefined : () => setOpen((value) => !value)}
        hitSlop={6}
        style={styles.hintBtn}
      >
        <Text style={styles.hintMark}>i</Text>
      </Pressable>
      {open ? (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.tooltipText}>{text}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function HostAnalyticsStatCard({
  label,
  value,
  tone = "default",
  compact = false,
  dense = false,
  fill = false,
  glass = false,
  hint,
  icon,
}: Props) {
  const inner = (
    <>
      <View style={styles.labelRow}>
        {icon ? (
          <AnalyticsCardIconMark name={icon} warning={tone === "warning"} />
        ) : null}
        <Text style={styles.label}>{label}</Text>
        {hint ? <InfoHint text={hint} /> : null}
      </View>
      <Text style={[styles.value, compact && styles.valueCompact]}>{value}</Text>
    </>
  );

  const cardStyle = [
    styles.card,
    compact && styles.cardCompact,
    dense && styles.cardDense,
    fill && styles.cardFill,
    glass ? styles.cardGlass : styles.cardSolid,
    !glass && tone === "warning" ? styles.cardWarning : null,
    hint ? styles.cardHint : null,
  ];

  if (glass) {
    return (
      <HostAnalyticsGlassPane
        warning={tone === "warning"}
        style={cardStyle}
      >
        {inner}
      </HostAnalyticsGlassPane>
    );
  }

  return <View style={cardStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 200,
    minWidth: 200,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    ...(web ? { boxSizing: "border-box" as const } : null),
  },
  cardSolid: {
    borderColor: "#E2E8F0",
    backgroundColor: Skoun.color.surface,
  },
  cardCompact: {
    flexBasis: "47%",
    minWidth: 140,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardDense: {
    paddingVertical: 14,
  },
  cardFill: {
    width: "100%",
    minWidth: 0,
    flexGrow: 0,
    flexBasis: "auto",
  },
  cardHint: {
    zIndex: 4,
    overflow: "visible",
  },
  cardWarning: {
    backgroundColor: Skoun.color.warningSoft,
    borderColor: "rgba(180,83,9,0.22)",
  },
  cardGlass: {
    gap: 0,
  },
  glassPane: {
    position: "relative",
    overflow: "visible",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: web ? "transparent" : "rgba(255,255,255,0.82)",
    borderColor: web ? "transparent" : "rgba(226,232,240,0.95)",
  },
  glassPaneWarningNative: {
    backgroundColor: Skoun.color.warningSoft,
    borderColor: "rgba(180,83,9,0.22)",
  },
  glassSheenClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    overflow: "hidden",
  },
  glassSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "70%",
  },
  glassRim: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  glassBody: {
    position: "relative",
    zIndex: 1,
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 2,
  },
  iconMark: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
    color: "#8B95A1",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  hintWrap: {
    position: "relative",
    zIndex: 3,
  },
  hintBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C5CED8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    ...(web ? { cursor: "pointer" as const } : null),
  },
  hintMark: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 10,
    lineHeight: 12,
    color: "#8B95A1",
    ...(web ? { fontStyle: "italic" as const } : null),
  },
  tooltip: {
    position: "absolute",
    bottom: 22,
    left: -96,
    width: 220,
    zIndex: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Skoun.color.ink,
    ...(web
      ? { boxShadow: "0 10px 24px rgba(18,24,38,0.18)" }
      : null),
  },
  tooltipText: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: "#FFFFFF",
  },
  value: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: Skoun.color.ink,
  },
  valueCompact: {
    fontSize: 28,
    lineHeight: 32,
  },
});
