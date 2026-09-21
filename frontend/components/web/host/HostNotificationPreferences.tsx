import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";
import { Skoun } from "@/constants/theme";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/features/notifications/useNotificationPreferences";

export function HostNotificationPreferences({ compact = false }: { compact?: boolean }) {
  const query = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  if (query.isLoading) {
    return <ActivityIndicator color={Skoun.color.primary} size="small" />;
  }
  if (!query.data) return null;
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.heading}>
        <View style={styles.icon}>
          <Ionicons name="notifications-outline" size={18} color={Skoun.color.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Expiry reminders</Text>
          <Text style={styles.body}>Choose how Skoun reminds you before a listing closes.</Text>
        </View>
      </View>
      <View style={styles.controls}>
        <PreferenceSwitch
          label="Push"
          value={query.data.expiryPushEnabled}
          disabled={update.isPending}
          onValueChange={(expiryPushEnabled) => update.mutate({ expiryPushEnabled })}
        />
        <PreferenceSwitch
          label="Email"
          value={query.data.expiryEmailEnabled}
          disabled={update.isPending}
          onValueChange={(expiryEmailEnabled) => update.mutate({ expiryEmailEnabled })}
        />
      </View>
    </View>
  );
}

function PreferenceSwitch(props: {
  label: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{props.label}</Text>
      <Switch
        accessibilityLabel={`${props.label} expiry reminders`}
        value={props.value}
        disabled={props.disabled}
        onValueChange={props.onValueChange}
        trackColor={{ false: Skoun.color.border, true: Skoun.color.primarySoft }}
        thumbColor={props.value ? Skoun.color.primary : "#FFFFFF"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 24,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  cardCompact: { flexDirection: "column", alignItems: "stretch" },
  heading: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.primaryMist,
  },
  copy: { flex: 1, gap: 2 },
  title: { fontFamily: Skoun.type.bodySemi, fontSize: 15, color: Skoun.color.ink },
  body: { fontFamily: Skoun.type.body, fontSize: 13, lineHeight: 18, color: Skoun.color.inkMuted },
  controls: { flexDirection: "row", gap: 16, alignItems: "center" },
  switchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  switchLabel: { fontFamily: Skoun.type.bodyMedium, fontSize: 13, color: Skoun.color.ink },
});
