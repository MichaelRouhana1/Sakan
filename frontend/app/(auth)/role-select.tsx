import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { switchToRole } from "@/features/auth/useEnsureSession";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { UserRole } from "@/types/user";

type RoleOption = {
  role: UserRole;
  title: string;
  benefit: string;
  icon: keyof typeof Ionicons.glyphMap;
  a11yLabel: string;
};

const OPTIONS: RoleOption[] = [
  {
    role: "renter",
    title: "Looking for a place",
    benefit: "Browse cities & campuses, then WhatsApp landlords directly.",
    icon: "search-outline",
    a11yLabel: "Looking for a place — browse cities and campuses, WhatsApp landlords",
  },
  {
    role: "poster",
    title: "Listing a place",
    benefit: "Publish a rental and reach renters across Lebanon.",
    icon: "home-outline",
    a11yLabel: "Listing a place — publish a rental and reach renters in Lebanon",
  },
];

const SELECT_MS = 260;

function RoleCard({
  option,
  selected,
  disabled,
  onSelect,
  reduceMotion,
  equalWidth,
}: {
  option: RoleOption;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  reduceMotion: boolean;
  equalWidth: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: selected ? 1.02 : 1,
      duration: reduceMotion ? 0 : SELECT_MS,
      useNativeDriver: true,
    }).start();
  }, [selected, reduceMotion, scale]);

  return (
    <Animated.View
      style={[
        styles.cardShell,
        equalWidth && styles.cardShellWide,
        { transform: [{ scale }] },
      ]}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={option.a11yLabel}
        disabled={disabled}
        onPress={onSelect}
        style={({ pressed }) => [
          styles.card,
          selected && styles.cardSelected,
          pressed && !disabled && styles.cardPressed,
        ]}
      >
        <View
          style={[styles.iconWrap, selected && styles.iconWrapSelected]}
          accessibilityElementsHidden
        >
          <Ionicons
            name={option.icon}
            size={28}
            color={selected ? Lister.color.surface : Lister.color.primary}
          />
        </View>

        <View style={styles.cardCopy}>
          <LText
            variant="subtitle"
            style={selected ? styles.cardTitleOn : undefined}
          >
            {option.title}
          </LText>
          <LText variant="body" tone="muted" style={styles.benefit}>
            {option.benefit}
          </LText>
        </View>

        <View
          style={[styles.check, selected && styles.checkOn]}
          accessibilityElementsHidden
        >
          {selected ? (
            <Ionicons
              name="checkmark"
              size={16}
              color={Lister.color.surface}
            />
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function RoleSelectScreen() {
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const wide = width >= 640;

  async function continueWithRole() {
    if (!selected || loading) return;
    setLoading(true);
    setError(null);
    try {
      await switchToRole(selected);
      router.replace(selected === "renter" ? "/(renter)" : "/(poster)");
    } catch {
      setError(
        "We couldn’t switch roles. Check your connection and try again.",
      );
      void AccessibilityInfo.announceForAccessibility(
        "Could not switch roles. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ListerScreen edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <LText variant="label" tone="brass">
            Welcome to Skoun
          </LText>
          <LText variant="display" style={styles.title}>
            How will you use Skoun?
          </LText>
          <LText variant="body" tone="muted">
            Choose one path. You can switch anytime from Saved or Credits —
            no page refresh needed.
          </LText>
        </View>

        <View
          style={[styles.cards, wide && styles.cardsWide]}
          accessibilityRole="radiogroup"
          accessibilityLabel="Choose your role"
        >
          {OPTIONS.map((option) => (
            <RoleCard
              key={option.role}
              option={option}
              selected={selected === option.role}
              disabled={loading}
              reduceMotion={reduceMotion}
              equalWidth={wide}
              onSelect={() => {
                setSelected(option.role);
                setError(null);
              }}
            />
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={Lister.color.danger}
            />
            <LText variant="caption" tone="danger" style={styles.errorText}>
              {error}
            </LText>
          </View>
        ) : null}

        <LButton
          label="Continue"
          loading={loading}
          disabled={!selected || loading}
          onPress={() => void continueWithRole()}
          accessibilityHint={
            selected
              ? `Continue as ${selected === "renter" ? "renter" : "poster"}`
              : "Select a role first"
          }
          style={styles.cta}
        />
      </ScrollView>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Lister.space.lg,
    paddingTop: Lister.space.md,
    paddingBottom: Lister.space.xl,
    gap: Lister.space.lg,
    justifyContent: "center",
  },
  hero: {
    gap: 8,
    marginBottom: 4,
  },
  title: {
    letterSpacing: -0.6,
  },
  cards: {
    gap: 14,
  },
  cardsWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  cardShell: {
    width: "100%",
  },
  cardShellWide: {
    flex: 1,
    width: undefined,
  },
  card: {
    flex: 1,
    minHeight: 148,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 18,
    borderRadius: Lister.radius.lg,
    backgroundColor: Lister.color.surface,
    borderWidth: 2,
    borderColor: Lister.color.border,
  },
  cardSelected: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
  },
  cardPressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Lister.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.primaryMist,
    borderWidth: 1,
    borderColor: Lister.color.primarySoft,
  },
  iconWrapSelected: {
    backgroundColor: Lister.color.primary,
    borderColor: Lister.color.primary,
  },
  cardCopy: {
    flex: 1,
    gap: 6,
    paddingTop: 2,
  },
  cardTitleOn: {
    color: Lister.color.primaryDeep,
    fontFamily: Lister.type.bodyBold,
  },
  benefit: {
    lineHeight: 20,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Lister.color.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkOn: {
    backgroundColor: Lister.color.primary,
    borderColor: Lister.color.primary,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(180, 35, 24, 0.2)",
  },
  errorText: {
    flex: 1,
  },
  cta: {
    marginTop: 4,
  },
});
