import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type View as ViewType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { SquishSwitch } from "@/components/ui/SquishSwitch";
import { Lister } from "@/constants/listerTheme";
import { publishListingFeedback } from "@/features/saved/savedToast";
import {
  callingCode,
  countryName,
  examplePlaceholder,
  formatForCountry,
  isFixedLine,
  maxNationalDigits,
  nationalFromInput,
  phoneError,
  rankCountryChoices,
  samePhone,
  toE164,
  type ContactNumber,
  type CountryChoice,
} from "@/lib/lebanonPhone";
import { WHATSAPP_GREEN } from "@/lib/whatsapp";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";

function Flag({ code }: { code: string }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <Ionicons name="earth-outline" size={designSize(16)} color={Lister.color.inkMuted} />;
  }
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={{ uri: `https://flagcdn.com/w40/${code.toLowerCase()}.png` }}
      style={styles.flag}
      onError={() => setFailed(true)}
    />
  );
}

const COUNTRY_LIST: CountryChoice[] = (() => {
  let names: Intl.DisplayNames | null = null;
  try {
    if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
      names = new Intl.DisplayNames(["en"], { type: "region" });
    }
  } catch {
    names = null;
  }
  return getCountries().map((code) => ({
    code,
    name: names?.of(code) ?? countryName(code),
    calling: getCountryCallingCode(code),
  }));
})();

/** Same red knob as auto-renew. Only the on-track is WhatsApp green. */
const WHATSAPP_SWITCH_COLORS = { trackOn: WHATSAPP_GREEN };

type Props = {
  value: ContactNumber;
  others: ContactNumber[];
  error?: boolean;
  canRemove?: boolean;
  primary?: boolean;
  index: number;
  onChange: (next: ContactNumber) => void;
  onRemove?: () => void;
  onMakePrimary?: () => void;
};

export function LebanonPhoneField({
  value,
  others,
  error,
  canRemove,
  primary,
  index,
  onChange,
  onRemove,
  onMakePrimary,
}: Props) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sheet = Platform.OS !== "web" || windowWidth < 768;
  const rowRef = useRef<ViewType>(null);
  const ignoreBlur = useRef(false);
  const [text, setText] = useState(() => formatForCountry(value.country || "LB", value.national));
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [anchor, setAnchor] = useState({ x: 16, y: 16, w: 320, h: 48 });
  const number = index + 1;
  const country = value.country || "LB";
  const choices = useMemo(() => rankCountryChoices(COUNTRY_LIST, query), [query]);
  const maxDigits = maxNationalDigits(country);
  const digits = value.national.replace(/\D/g, "");
  const overLimit = digits.length > maxDigits;
  const duplicate = others.some((other) => samePhone(value, other));
  const valid = Boolean(toE164(value)) && !overLimit;
  const showError = overLimit || ((touched || Boolean(error)) && (!valid || duplicate));
  const message = duplicate ? "This number is already added." : phoneError(value);
  const fixed = isFixedLine(value);

  useEffect(() => {
    const national = value.national.replace(/\D/g, "");
    setText(national.length > maxNationalDigits(country) ? national : formatForCountry(country, national));
  }, [country, value.national]);

  useEffect(() => {
    if (!open || Platform.OS !== "web") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(choices.length - 1, 0)));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (event.key === "Enter" && choices[active]) {
        event.preventDefault();
        chooseCountry(choices[active].code);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, choices, active]);

  function commit(raw: string) {
    let national = nationalFromInput(country, raw);
    if (national.length > maxDigits) national = national.slice(0, maxDigits);
    setText(formatForCountry(country, national));
    onChange({ ...value, country, national });
  }

  function chooseCountry(next: string) {
    const national = value.national.replace(/\D/g, "");
    const nextMax = maxNationalDigits(next);
    onChange({ ...value, country: next, national });
    setText(national.length > nextMax ? national : formatForCountry(next, national));
    setOpen(false);
    setQuery("");
  }

  function openPicker() {
    ignoreBlur.current = true;
    setQuery("");
    setActive(0);
    const node = rowRef.current as unknown as {
      measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
      getBoundingClientRect?: () => { x: number; y: number; width: number; height: number };
    } | null;
    if (node?.getBoundingClientRect) {
      const rect = node.getBoundingClientRect();
      setAnchor({ x: rect.x, y: rect.y, w: rect.width, h: rect.height });
      setOpen(true);
      return;
    }
    if (node?.measureInWindow) {
      node.measureInWindow((x, y, w, h) => {
        setAnchor({ x, y, w, h });
        setOpen(true);
      });
      return;
    }
    setOpen(true);
  }

  const menu = (
    <View style={styles.menu}>
      <TextInput
        accessibilityLabel="Search countries"
        autoFocus
        placeholder="Search country or code"
        placeholderTextColor={Lister.color.inkFaint}
        value={query}
        onChangeText={(next) => {
          setQuery(next);
          setActive(0);
        }}
        style={styles.search}
      />
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
        {choices.map((choice, i) => (
          <Pressable
            key={choice.code}
            accessibilityRole="button"
            accessibilityState={{ selected: choice.code === country }}
            onPress={() => chooseCountry(choice.code)}
            style={[styles.option, i === active && styles.optionActive, choice.code === country && styles.optionSelected]}
          >
            <Flag code={choice.code} />
            <Text style={styles.optionName}>{choice.name}</Text>
            <Text style={styles.optionCode}>+{choice.calling}</Text>
          </Pressable>
        ))}
        {choices.length === 0 ? <Text style={styles.empty}>No matching country</Text> : null}
      </ScrollView>
    </View>
  );

  const popWidth = Math.min(Math.max(anchor.w, designSize(320)), windowWidth - 16);
  const popHeight = designSize(380);
  const left = Math.max(8, Math.min(anchor.x, windowWidth - popWidth - 8));
  let top = anchor.y + anchor.h + 4;
  if (top + popHeight > windowHeight) top = Math.max(8, anchor.y - popHeight - 4);

  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <Text style={styles.headLabel}>Number {number}</Text>
        <View style={styles.headActions}>
          {primary ? (
            <View accessibilityLabel="Primary number" style={styles.primaryBadge}>
              <Text style={styles.primaryText}>Primary</Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Make number ${number} primary`}
              onPress={onMakePrimary}
              style={(state) => [styles.makePrimary, state.hovered && styles.makePrimaryHover]}
            >
              {(state) => (
                <Text style={[styles.makePrimaryText, state.hovered && styles.makePrimaryTextHover]}>
                  Make primary
                </Text>
              )}
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove number ${number}`}
            accessibilityState={{ disabled: !canRemove }}
            disabled={!canRemove}
            onPress={onRemove}
            style={styles.remove}
          >
            <Ionicons name="trash-outline" size={designSize(18)} color={canRemove ? Lister.color.inkMuted : Lister.color.border} />
          </Pressable>
        </View>
      </View>

      <View ref={rowRef} style={[styles.row, focused && styles.rowFocus, showError && styles.rowError]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Country code, ${countryName(country)} +${callingCode(country)}`}
          onPress={openPicker}
          style={styles.country}
        >
          <Flag code={country} />
          <Text style={styles.code}>+{callingCode(country)}</Text>
          <Ionicons name="chevron-down" size={designSize(14)} color={Lister.color.inkMuted} />
        </Pressable>
        <TextInput
          accessibilityLabel={`Phone number ${number}`}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder={examplePlaceholder(country)}
          placeholderTextColor={Lister.color.inkFaint}
          value={text}
          onChangeText={commit}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (ignoreBlur.current) {
              ignoreBlur.current = false;
              return;
            }
            setTouched(true);
          }}
          style={styles.input}
        />
      </View>
      {showError ? (
        <Text accessibilityRole="alert" style={styles.error}>{message}</Text>
      ) : null}

      <View style={styles.whatsappRow}>
        <Text style={[styles.whatsappLabel, fixed && styles.disabledText]}>Available on WhatsApp</Text>
        <SquishSwitch
          accessibilityLabel={`Number ${number} available on WhatsApp`}
          disabled={fixed}
          value={!fixed && value.whatsapp}
          onValueChange={(whatsapp) => {
            onChange({ ...value, whatsapp });
            publishListingFeedback(
              `whatsapp:${value.id}`,
              whatsapp ? "Available on WhatsApp." : "Not on WhatsApp.",
            );
          }}
          colors={WHATSAPP_SWITCH_COLORS}
        />
      </View>
      {fixed ? <Text style={styles.hint}>Landlines are for calls only.</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        {sheet ? (
          <View style={styles.sheetRoot}>
            <Pressable accessibilityLabel="Close country list" onPress={() => setOpen(false)} style={styles.scrim} />
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>Country code</Text>
              {menu}
            </View>
          </View>
        ) : (
          <View style={styles.popRoot} pointerEvents="box-none">
            <Pressable accessibilityLabel="Close country list" onPress={() => setOpen(false)} style={styles.clearBackdrop} />
            <View style={[styles.popover, { top, left, width: popWidth }]}>{menu}</View>
          </View>
        )}
      </Modal>
    </View>
  );
}

export function AddNumberButton({ onPress }: { onPress: () => void }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add another phone number"
      onPress={onPress}
      style={styles.add}
    >
      <Ionicons name="add" size={designSize(18)} color={Lister.color.ink} />
      <Text style={styles.addText}>Add another number</Text>
    </Pressable>
  );
}

const baseStyles = StyleSheet.create({
  block: { gap: 6 },
  head: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headLabel: { fontFamily: Lister.type.bodySemi, fontSize: 14, color: Lister.color.ink },
  headActions: { flexDirection: "row", alignItems: "center" },
  primaryBadge: {
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: Lister.radius.pill,
    borderWidth: 1,
    borderColor: "#EA3F4A",
    backgroundColor: "rgba(234, 63, 74, 0.08)",
  },
  primaryText: { fontFamily: Lister.type.bodyMedium, fontSize: 13, color: "#EA3F4A" },
  makePrimary: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  makePrimaryText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 13,
    color: Lister.color.inkMuted,
    textDecorationLine: "underline",
  },
  makePrimaryHover: {},
  makePrimaryTextHover: { color: "#EA3F4A" },
  remove: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.surface,
  },
  rowFocus: { borderWidth: 2, borderColor: "#EA3F4A" },
  rowError: { borderColor: Lister.color.danger },
  country: {
    minHeight: 48,
    paddingLeft: 12,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRightWidth: 1,
    borderRightColor: Lister.color.border,
  },
  flag: { width: 22, height: 16, borderRadius: 2 },
  code: { fontFamily: Lister.type.bodySemi, fontSize: 15, color: Lister.color.ink },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    fontFamily: Lister.type.body,
    fontSize: 16,
    color: Lister.color.ink,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as unknown as "solid" } : {}),
  },
  error: { fontFamily: Lister.type.body, fontSize: 13, color: Lister.color.danger },
  hint: { fontFamily: Lister.type.body, fontSize: 13, color: Lister.color.inkMuted },
  whatsappRow: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  whatsappLabel: { flex: 1, fontFamily: Lister.type.body, fontSize: 15, color: Lister.color.ink },
  disabledText: { color: Lister.color.inkFaint },
  popRoot: { flex: 1 },
  clearBackdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  popover: {
    position: "absolute",
    backgroundColor: Lister.color.surface,
    borderRadius: Lister.radius.md,
    borderWidth: 1,
    borderColor: Lister.color.border,
    overflow: "hidden",
    ...(Platform.OS === "web" ? { boxShadow: "0 12px 32px rgba(26,26,26,0.16)" } : { elevation: 8 }),
  },
  sheetRoot: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(26,26,26,0.28)" },
  sheet: {
    backgroundColor: Lister.color.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 12,
    paddingTop: 8,
    maxHeight: "80%",
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Lister.color.border, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontFamily: Lister.type.bodySemi, fontSize: 16, color: Lister.color.ink, paddingHorizontal: 8, paddingBottom: 8 },
  menu: { maxHeight: 360 },
  search: {
    minHeight: 44,
    margin: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: Lister.radius.sm,
    fontFamily: Lister.type.body,
    fontSize: 15,
    color: Lister.color.ink,
  },
  list: { maxHeight: 280 },
  option: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12 },
  optionActive: { backgroundColor: Lister.color.surfaceMuted },
  optionSelected: { backgroundColor: Lister.color.bg },
  optionName: { flex: 1, fontFamily: Lister.type.body, fontSize: 15, color: Lister.color.ink },
  optionCode: { fontFamily: Lister.type.body, fontSize: 14, color: Lister.color.inkMuted },
  empty: { padding: 16, fontFamily: Lister.type.body, color: Lister.color.inkMuted },
  add: {
    alignSelf: "flex-start",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.surface,
  },
  addText: { fontFamily: Lister.type.bodyMedium, fontSize: 15, color: Lister.color.ink },
});
