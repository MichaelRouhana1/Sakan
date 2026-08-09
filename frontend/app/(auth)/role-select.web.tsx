import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { WebShell } from "@/components/web/WebShell";
import { Skoun } from "@/constants/theme";
import { switchToRole } from "@/features/auth/useEnsureSession";
import type { UserRole } from "@/types/user";

const OPTIONS: {
  role: UserRole;
  title: string;
  benefit: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    role: "renter",
    title: "Looking for a place",
    benefit: "Browse cities and campuses, save listings, WhatsApp landlords.",
    icon: "search-outline",
  },
  {
    role: "poster",
    title: "Listing a place",
    benefit: "Publish a rental and reach renters across Lebanon.",
    icon: "home-outline",
  },
];

export default function RoleSelectWebScreen() {
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueWithRole() {
    if (!selected || loading) return;
    setLoading(true);
    setError(null);
    try {
      await switchToRole(selected);
      router.replace(
        (selected === "renter" ? "/search" : "/(poster)/(tabs)/create") as never,
      );
    } catch {
      setError("We couldn’t switch roles. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebShell showFooter={false}>
      <View style={styles.page}>
        <View style={styles.hero}>
          <LText variant="label" tone="primary">
            Welcome to Skoun
          </LText>
          <LText variant="display" style={styles.title}>
            How will you use Skoun?
          </LText>
          <LText variant="body" tone="muted" style={styles.sub}>
            Choose one path. You can switch anytime from Saved or Credits.
          </LText>
        </View>

        <View style={styles.cards} accessibilityRole="radiogroup">
          {OPTIONS.map((option) => {
            const active = selected === option.role;
            return (
              <Pressable
                key={option.role}
                accessibilityRole="radio"
                accessibilityState={{ selected: active, disabled: loading }}
                disabled={loading}
                onPress={() => {
                  setSelected(option.role);
                  setError(null);
                }}
                style={({ hovered }) => [
                  styles.card,
                  active && styles.cardActive,
                  hovered && !active && styles.cardHover,
                ]}
              >
                <View style={[styles.icon, active && styles.iconActive]}>
                  <Ionicons
                    name={option.icon}
                    size={28}
                    color={active ? "#fff" : Skoun.color.primary}
                  />
                </View>
                <View style={styles.cardBody}>
                  <LText variant="title" style={styles.cardTitle}>
                    {option.title}
                  </LText>
                  <LText variant="body" tone="muted">
                    {option.benefit}
                  </LText>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View style={styles.error} accessibilityRole="alert">
            <LText variant="caption" tone="danger">
              {error}
            </LText>
          </View>
        ) : null}

        <View style={styles.actions}>
          <LButton
            label="Continue"
            loading={loading}
            disabled={!selected || loading}
            onPress={() => void continueWithRole()}
            style={styles.cta}
          />
          <Pressable
            accessibilityRole="link"
            onPress={() => router.replace("/search" as never)}
          >
            <LText variant="caption" tone="primary">
              Browse without signing in
            </LText>
          </Pressable>
        </View>
      </View>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  page: {
    maxWidth: 720,
    alignSelf: "center",
    width: "100%",
    paddingVertical: 32,
    gap: 28,
  },
  hero: {
    gap: 8,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    color: Skoun.color.primaryDeep,
    letterSpacing: -0.5,
  },
  sub: {
    lineHeight: 22,
    maxWidth: 520,
  },
  cards: {
    gap: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    padding: 20,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  cardActive: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  cardHover: {
    borderColor: Skoun.color.borderStrong,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.primaryMist,
  },
  iconActive: {
    backgroundColor: Skoun.color.primary,
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    fontSize: 20,
    color: Skoun.color.primaryDeep,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Skoun.color.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  radioActive: {
    backgroundColor: Skoun.color.primary,
    borderColor: Skoun.color.primary,
  },
  error: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: Skoun.color.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(180, 35, 24, 0.2)",
  },
  actions: {
    gap: 14,
    alignItems: "flex-start",
  },
  cta: {
    minWidth: 200,
  },
});
