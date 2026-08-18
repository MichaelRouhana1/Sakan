import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import {
  formatSubscriber,
  LANDLINE_PREFIX_HINT,
  prefixesFor,
  sanitizeSubscriber,
  type ContactNumber,
  type PhoneKind,
} from "@/lib/lebanonPhone";

type Props = {
  value: ContactNumber;
  error?: boolean;
  canRemove?: boolean;
  index: number;
  onChange: (next: ContactNumber) => void;
  onRemove?: () => void;
};

export function LebanonPhoneField({
  value,
  error,
  canRemove,
  index,
  onChange,
  onRemove,
}: Props) {
  const prefixes = prefixesFor(value.kind);

  function setKind(kind: PhoneKind) {
    const prefix = prefixesFor(kind).includes(value.prefix)
      ? value.prefix
      : kind === "landline"
        ? "01"
        : "71";
    onChange({
      ...value,
      kind,
      prefix,
      whatsapp: kind === "mobile" ? value.whatsapp : false,
      calls: kind === "landline" ? true : value.calls,
    });
  }

  function toggleCalls() {
    if (value.kind === "landline") return;
    if (value.calls && !value.whatsapp) return;
    onChange({ ...value, calls: !value.calls });
  }

  function toggleWhatsApp() {
    if (value.kind === "landline") return;
    if (value.whatsapp && !value.calls) return;
    onChange({ ...value, whatsapp: !value.whatsapp });
  }

  return (
    <View style={[styles.card, error && styles.cardError]}>
      <View style={styles.head}>
        <LText variant="caption" style={styles.headLabel}>
          Number {index + 1}
        </LText>
        {canRemove ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove number ${index + 1}`}
            onPress={onRemove}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={18} color={Lister.color.danger} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.kindRow}>
        <KindChip
          label="Mobile"
          selected={value.kind === "mobile"}
          onPress={() => setKind("mobile")}
        />
        <KindChip
          label="Telephone"
          selected={value.kind === "landline"}
          onPress={() => setKind("landline")}
        />
      </View>

      <View style={styles.prefixWrap}>
        {prefixes.map((p) => {
          const on = value.prefix === p;
          const hint =
            value.kind === "landline"
              ? LANDLINE_PREFIX_HINT[p as keyof typeof LANDLINE_PREFIX_HINT]
              : null;
          return (
            <Pressable
              key={p}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onChange({ ...value, prefix: p })}
              style={[styles.prefix, on && styles.prefixOn]}
            >
              <LText variant="caption" style={on ? styles.prefixTextOn : styles.prefixText}>
                {p}
              </LText>
              {hint && on ? (
                <LText variant="caption" style={styles.prefixHint}>
                  {hint}
                </LText>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.inputRow, error && styles.inputRowError]}>
        <LText variant="subtitle" style={styles.cc}>
          +961
        </LText>
        <View style={styles.prefixBadge}>
          <LText variant="subtitle">{value.prefix}</LText>
        </View>
        <TextInput
          accessibilityLabel={`Lebanese ${value.kind} number ${index + 1}`}
          keyboardType="number-pad"
          placeholder={value.kind === "landline" ? "234 567" : "123 456"}
          placeholderTextColor={Lister.color.inkFaint}
          value={formatSubscriber(value.subscriber)}
          onChangeText={(raw) =>
            onChange({ ...value, subscriber: sanitizeSubscriber(raw) })
          }
          style={styles.input}
          maxLength={7}
        />
      </View>

      {value.kind === "landline" ? (
        <LText variant="caption" tone="muted">
          Landline — voice calls only (01 / 04–09).
        </LText>
      ) : (
        <View style={styles.useRow}>
          <UseChip
            icon="call-outline"
            label="Calls"
            selected={value.calls}
            onPress={toggleCalls}
          />
          <UseChip
            icon="logo-whatsapp"
            label="WhatsApp"
            selected={value.whatsapp}
            onPress={toggleWhatsApp}
          />
        </View>
      )}
    </View>
  );
}

function KindChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.kind, selected && styles.kindOn]}
    >
      <LText variant="caption" style={selected ? styles.kindTextOn : styles.kindText}>
        {label}
      </LText>
    </Pressable>
  );
}

function UseChip({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.use, selected && styles.useOn]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={selected ? "#FFFFFF" : Lister.color.inkMuted}
      />
      <LText variant="caption" style={selected ? styles.useTextOn : styles.useText}>
        {label}
      </LText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 12,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  cardError: {
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headLabel: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.inkMuted,
  },
  kindRow: { flexDirection: "row", gap: 8 },
  kind: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: Lister.radius.md,
    borderWidth: 1.5,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surfaceMuted,
  },
  kindOn: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
  },
  kindText: { fontFamily: Lister.type.bodySemi, color: Lister.color.inkMuted },
  kindTextOn: { fontFamily: Lister.type.bodySemi, color: Lister.color.primaryDeep },
  prefixWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  prefix: {
    minWidth: 44,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Lister.radius.pill,
    borderWidth: 1.5,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
  },
  prefixOn: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
  },
  prefixText: { fontFamily: Lister.type.bodySemi, color: Lister.color.ink },
  prefixTextOn: { fontFamily: Lister.type.bodySemi, color: Lister.color.primaryDeep },
  prefixHint: { color: Lister.color.inkMuted, fontSize: 10, lineHeight: 12 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: Lister.color.border,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inputRowError: {
    borderColor: Lister.color.danger,
  },
  cc: { color: Lister.color.inkMuted },
  prefixBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Lister.radius.sm,
    backgroundColor: Lister.color.primaryMist,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: Lister.type.bodySemi,
    fontSize: 18,
    color: Lister.color.ink,
    letterSpacing: 0.5,
  },
  useRow: { flexDirection: "row", gap: 8 },
  use: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: Lister.radius.md,
    borderWidth: 1.5,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surfaceMuted,
  },
  useOn: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primary,
  },
  useText: { fontFamily: Lister.type.bodySemi, color: Lister.color.inkMuted },
  useTextOn: { fontFamily: Lister.type.bodySemi, color: "#FFFFFF" },
});
