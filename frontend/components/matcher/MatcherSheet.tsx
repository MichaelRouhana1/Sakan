import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Building2,
  Check,
  DoorOpen,
  GraduationCap,
  Home,
  LayoutGrid,
  MapPin,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sun,
  Wifi,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { SafeAreaListener, useSafeAreaInsets } from "react-native-safe-area-context";
import { Skoun } from "@/constants/theme";
import { useLiveLebanonAreas } from "@/constants/areas";
import { useUniversities } from "@/features/universities/useUniversities";
import { useSearchSuggestions } from "@/features/search/useSearchSuggestions";
import type { BrowseFiltersValue } from "@/lib/browseFiltersValue";
import { LISTING_TYPE_LABELS } from "@/lib/listingLabels";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  campusLocation,
  existingFilterLabels,
  hasAnswers,
  prefillPreferences,
} from "@/features/matcher/preferences";
import {
  readMatcherPreferences,
  saveMatcherPreferences,
} from "@/features/matcher/storage";
import { answerLabel, QUESTIONS } from "@/features/matcher/questions";
import {
  DIMENSIONS,
  type Dimension,
  type MatcherPreferences,
  type MatchLocation,
} from "@/features/matcher/types";
import type { ListingType } from "@/types/listing";
import { BotAvatar } from "./BotAvatar";
import { BotThinkingMark } from "./BotThinkingMark";
import { ChatBubble } from "./ChatBubble";
import { MenuCubes } from "./MenuCubes";
import { ThinkingLabel } from "./ThinkingLabel";
import { matcherStyles as s } from "./matcherStyles";

const BOT = 48;
const BOT_BUBBLE = "#D5DCE6";

function BotLine({
  avatar,
  playing = false,
  thinking = false,
  children,
}: {
  avatar: boolean;
  playing?: boolean;
  thinking?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[s.messageRow, avatar && s.messageRowWithAvatar]}>
      {avatar ? (
        <View style={s.botAvatarSlot}>
          <BotAvatar playing={playing} size={BOT} />
          {thinking ? <BotThinkingMark /> : null}
        </View>
      ) : (
        <View style={s.botSpacer} />
      )}
      <ChatBubble side="left" color={BOT_BUBBLE} tailed={avatar} style={s.botBubble}>
        {children}
      </ChatBubble>
    </View>
  );
}

export function PreferenceChip({
  label,
  selected,
  onPress,
  icon: Icon,
  displayLabel,
  tile = false,
  hug = false,
  mobileVariant,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: LucideIcon;
  displayLabel?: string;
  tile?: boolean;
  hug?: boolean;
  mobileVariant?: "tile" | "row" | "compact";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      aria-pressed={!!selected}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        s.chip,
        tile && s.choiceTile,
        mobileVariant && s.mobileChoice,
        mobileVariant === "tile" && s.mobileChoiceTile,
        mobileVariant === "row" && s.mobileChoiceRow,
        mobileVariant === "compact" && s.mobileChoiceCompact,
        hug && s.budgetPresetHug,
        selected && s.chipSelected,
        (pressed || hovered) && s.chipHover,
      ]}
    >
      {Icon ? (
        <Icon
         
          size={mobileVariant ? 19 : 17}
          strokeWidth={1.6}
          color={selected ? Skoun.color.primary : Skoun.color.inkMuted}
        />
      ) : null}
      <Text
        numberOfLines={mobileVariant === "compact" ? 1 : undefined}
        style={[
          s.chipText,
          mobileVariant && s.mobileChoiceText,
          mobileVariant === "compact" && s.mobilePresetText,
          selected && s.chipTextSelected,
        ]}
      >
        {displayLabel ?? label}
      </Text>
      {mobileVariant && mobileVariant !== "compact" ? (
        <View style={[
          s.mobileChoiceMark,
          mobileVariant === "tile" && s.mobileChoiceMarkTile,
          selected && s.mobileChoiceMarkSelected,
        ]}>
          {selected ? <Check size={11} color="white" strokeWidth={2.5} /> : null}
        </View>
      ) : selected && !tile && !mobileVariant ? (
        <Check size={13} color={Skoun.color.primary} />
      ) : null}
    </Pressable>
  );
}
export function FindMyPlaceEntry({
  onPress,
  label = "Find my place",
}: {
  onPress: () => void;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        s.entry,
        (pressed || hovered) && { opacity: 0.86 },
      ]}
    >
      <BotAvatar playing size={28} />
      <Text style={s.entryText}>{label}</Text>
    </Pressable>
  );
}

const LOCATION_MODES = [
  ["campus", "Campus"],
  ["area", "Area"],
  ["anywhere", "Anywhere"],
] as const;

function LocationPicker({
  value,
  onSelect,
  onClear,
  mobile = false,
  onSearchFocusChange,
}: {
  value?: MatchLocation;
  onSelect: (location: MatchLocation) => void;
  onClear: () => void;
  mobile?: boolean;
  onSearchFocusChange?: (focused: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<(typeof LOCATION_MODES)[number][0]>(
    value?.kind ?? "campus",
  );
  const [searching, setSearching] = useState(!value);
  const [fieldFocused, setFieldFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const dismissKeyboard = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
  };
  useEffect(() => () => onSearchFocusChange?.(false), [onSearchFocusChange]);
  const universities = useUniversities();
  const areas = useLiveLebanonAreas();
  const suggestions = useSearchSuggestions(
    query || (value?.kind === "area" ? (value.areas?.[0] ?? "") : ""),
  );
  const hydratedArea = suggestions.data?.areas.find(
    (area) =>
      value?.kind === "area" &&
      value.areas?.length === 1 &&
      area.label === value.areas[0],
  );
  useEffect(() => {
    if (hydratedArea && value && !value.center)
      onSelect({ ...value, center: hydratedArea.center });
  }, [hydratedArea, value]);
  useEffect(() => {
    if (!searching || kind === "anywhere") return;
    const timer = setTimeout(() => {
      const node = inputRef.current as unknown as {
        focus?: (options?: { preventScroll?: boolean }) => void;
      } | null;
      node?.focus?.({ preventScroll: true });
    }, 180);
    return () => clearTimeout(timer);
  }, [searching, kind]);
  const needle = query.trim().toLowerCase();
  const choices: MatchLocation[] =
    kind === "anywhere"
      ? []
      : kind === "campus"
      ? (universities.data ?? [])
          .filter((university) =>
            [
              university.name,
              university.displayName,
              university.institutionName,
              university.institutionShortName,
            ].some((name) => name?.toLowerCase().includes(needle)),
          )
          .slice(0, mobile ? 6 : 3)
          .map(campusLocation)
      : areas
          .filter((area) => area.toLowerCase().includes(needle))
          .slice(0, mobile ? 6 : 3)
          .map((area) => ({
            kind: "area",
            label: area,
            areas: [area],
            center: suggestions.data?.areas.find((item) => item.label === area)
              ?.center,
          }));

  const segment = (
    <View style={[s.segment, mobile && s.mobileLocationSegment]}>
      {LOCATION_MODES.map(([option, label]) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityLabel={label}
          aria-pressed={kind === option}
          accessibilityState={{ selected: kind === option }}
          onPointerDown={(event) => {
            if (mobile && Platform.OS === "web") event.preventDefault();
          }}
          onPress={() => {
            setKind(option);
            setQuery("");
            if (option === "anywhere") {
              if (mobile) Keyboard.dismiss();
              setSearching(false);
              onClear();
            } else setSearching(true);
          }}
          style={[
            s.segmentOption,
            mobile && s.mobileLocationTab,
            kind === option && s.segmentSelected,
          ]}
        >
          <Text
            style={[s.segmentText, kind === option && s.segmentTextSelected]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (kind === "anywhere") return segment;

  if (value && !searching) {
    return (
      <View style={s.locationPicker}>
        {segment}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={"Change location: " + value.label}
          onPress={() => setSearching(true)}
          style={({ hovered, pressed }) => [
            s.selectedLocation,
            (hovered || pressed) && s.chipHover,
          ]}
        >
          <MapPin size={20} color={Skoun.color.primary} />
          <View style={s.locationCopy}>
            <Text style={s.locationLabel}>{value.label}</Text>
            <Text style={s.caption}>Selected {value.kind} · Tap to change</Text>
          </View>
          <Pencil size={15} color={Skoun.color.inkMuted} />
        </Pressable>
      </View>
    );
  }
  return (
    <View style={s.locationPicker}>
      {segment}
      <View style={[s.searchField, fieldFocused && s.searchFieldFocused]}>
        <Search size={17} color={Skoun.color.inkMuted} />
        <TextInput
          ref={inputRef}
          accessibilityLabel={
            "Search " + (kind === "campus" ? "campuses" : "areas")
          }
          placeholder={
            kind === "campus" ? "Search your university…" : "Search an area…"
          }
          placeholderTextColor={Skoun.color.inkMuted}
          value={query}
          onChangeText={setQuery}
          onFocus={() => {
            setFieldFocused(true);
            onSearchFocusChange?.(true);
          }}
          onBlur={() => {
            setFieldFocused(false);
            onSearchFocusChange?.(false);
          }}
          onSubmitEditing={() => {
            if (mobile) {
              dismissKeyboard();
              return;
            }
            const first = choices[0];
            if (!first) return;
            onSelect(first);
            setSearching(false);
            if (mobile) Keyboard.dismiss();
          }}
          style={s.input}
          autoCorrect={false}
          returnKeyType={mobile ? "done" : "search"}
          submitBehavior="blurAndSubmit"
        />
        {mobile && fieldFocused ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hide keyboard"
            onPress={dismissKeyboard}
            style={({ pressed }) => [s.keyboardDone, pressed && s.softHover]}
          >
            <Text style={s.keyboardDoneText}>Done</Text>
          </Pressable>
        ) : null}
      </View>
      {kind === "campus" && universities.isLoading ? (
        <ActivityIndicator style={s.loading} color={Skoun.color.primary} />
      ) : kind === "campus" && universities.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void universities.refetch()}
          style={s.textButton}
        >
          <Text style={s.link}>Couldn’t load campuses. Try again</Text>
        </Pressable>
      ) : (
        <View>
          {choices.map((location) => {
            const Icon = location.kind === "campus" ? GraduationCap : MapPin;
            return (
              <Pressable
                key={location.campusId ?? location.label}
                accessibilityRole="button"
                accessibilityLabel={location.label}
                onPointerDown={(event) => {
                  // Commit the result before blur can move the search panel.
                  if (mobile && Platform.OS === "web") event.preventDefault();
                }}
                onPress={() => {
                  onSelect(location);
                  setSearching(false);
                  if (mobile) Keyboard.dismiss();
                }}
                style={({ hovered, pressed }) => [
                  s.locationResult,
                  mobile && s.mobileLocationResult,
                  (hovered || pressed) && s.softHover,
                ]}
              >
                <Icon
                 
                  size={17}
                  color={Skoun.color.inkMuted}
                />
                <Text style={s.locationResultText} numberOfLines={1}>
                  {location.label}
                </Text>
                <ArrowUpRight
                 
                  size={15}
                  color={Skoun.color.inkMuted}
                />
              </Pressable>
            );
          })}
          {choices.length >= 3 || choices.length === 0 ? (
            <Text style={s.searchHint}>
              {choices.length
                ? "Search to see more " +
                  (kind === "campus" ? "campuses." : "areas.")
                : "No matches yet. Try another name."}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

type Props = {
  visible: boolean;
  filters: BrowseFiltersValue;
  applied: MatcherPreferences | null;
  firstName?: string | null;
  onClose: () => void;
  onApply: (p: MatcherPreferences) => void;
};

function replaceDimension(
  target: MatcherPreferences,
  source: MatcherPreferences,
  dimension: Dimension,
): MatcherPreferences {
  const next = { ...target };
  if (source[dimension])
    Object.assign(next, { [dimension]: source[dimension] });
  else delete next[dimension];
  return next;
}

const TYPE_ICONS: Record<ListingType, LucideIcon> = {
  entire_apartment: Home,
  studio: LayoutGrid,
  private_room: DoorOpen,
  shared_dorm_bed: BedDouble,
  pbsa_building: Building2,
};
const STEP_LABELS = [
  "Your space",
  "Monthly budget",
  "Your neighbourhood",
  "Who it’s for",
  "Power setup",
  "Staying connected",
];
const STEP_HINTS = [
  "Choose one or more",
  "Set a comfortable limit",
  "Choose a starting point",
  "Choose one",
  "Choose one",
  "Choose one",
];

function BudgetAmountField({
  mobile,
  min,
  max,
  onCommit,
  onClear,
}: {
  mobile: boolean;
  min: number | null;
  max: number | null;
  onCommit: (max: number) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<TextInput>(null);
  const echo = useRef<number | undefined>(undefined);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(max != null ? String(max) : "");
  const [fieldWidth, setFieldWidth] = useState(28);
  useEffect(() => {
    if (echo.current !== undefined && echo.current === max) {
      echo.current = undefined;
      return;
    }
    echo.current = undefined;
    setText(max != null ? String(max) : "");
  }, [max]);
  const parsed = Number.parseInt(text, 10);
  const hasAmount = text.length > 0 && Number.isInteger(parsed) && parsed > 0;
  const showPrefix = focused || hasAmount;
  const prefix = !showPrefix
    ? null
    : min != null && hasAmount && parsed >= min
      ? `$${min}–$`
      : "Up to $";
  const measure = text.length > 0 ? text : focused ? "00" : "No limit";
  return (
    <View style={s.budgetCopy}>
      <View style={s.budgetAmountRow}>
        <Text
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[s.budgetAmount, s.budgetMeasure, mobile && s.mobileBudgetAmount]}
          onLayout={(event) => {
            const next = Math.ceil(event.nativeEvent.layout.width);
            setFieldWidth((current) => (current === next ? current : next));
          }}
        >
          {measure}
        </Text>
        {prefix ? (
          <Pressable
            accessible={false}
            focusable={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
            onPress={() => inputRef.current?.focus()}
          >
            <Text style={[s.budgetAmount, s.budgetPrefix, mobile && s.mobileBudgetAmount]}>
              {prefix}
            </Text>
          </Pressable>
        ) : null}
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={(raw) => {
            const digits = raw.replace(/\D/g, "").slice(0, 6);
            setText(digits);
            const next = Number.parseInt(digits, 10);
            if (!Number.isInteger(next) || next <= 0) return;
            echo.current = next;
            onCommit(next);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            const next = Number.parseInt(text, 10);
            if (!text || !Number.isInteger(next) || next <= 0) {
              onClear();
              setText("");
              return;
            }
            setText(String(next));
          }}
          accessibilityLabel="Maximum monthly rent in US dollars"
          accessibilityHint={
            hasAmount
              ? `Up to ${parsed} dollars per month`
              : "No limit. Type a maximum rent."
          }
          keyboardType="number-pad"
          inputMode="numeric"
          returnKeyType="done"
          blurOnSubmit
          selectTextOnFocus
          maxLength={6}
          placeholder={focused ? "" : "No limit"}
          placeholderTextColor={Skoun.color.ink}
          underlineColorAndroid="transparent"
          selectionColor={Skoun.color.primary}
          style={[
            s.budgetAmount,
            s.budgetAmountInput,
            mobile && s.mobileBudgetAmount,
            focused && s.budgetAmountInputFocused,
            { width: Math.max(fieldWidth + 12, mobile ? 36 : 32) },
            Platform.OS === "web"
              ? ({
                  outlineStyle: "none",
                  caretColor: Skoun.color.primary,
                  cursor: "text",
                  transitionProperty: "border-bottom-color",
                  transitionDuration: "150ms",
                } as object)
              : null,
          ]}
        />
      </View>
      <Text style={s.caption}>USD / month</Text>
    </View>
  );
}

function MatcherControls({
  question,
  draft,
  update,
  answer,
  clearAnswer,
  mobile = false,
  onLocationFocusChange,
}: {
  question: (typeof QUESTIONS)[number];
  draft: MatcherPreferences;
  update: (next: MatcherPreferences) => void;
  answer: (dimension: Dimension, value: unknown) => void;
  clearAnswer: (dimension: Dimension) => void;
  mobile?: boolean;
  onLocationFocusChange?: (focused: boolean) => void;
}) {
  const mobileVariant = mobile
    ? question.key === "type"
      ? "tile"
      : question.key === "budget"
        ? "compact"
        : "row"
    : undefined;
  const noPreference = (
    <PreferenceChip
      mobileVariant={mobileVariant}
      tile={question.key === "type"}
      icon={question.key === "type" ? SlidersHorizontal : undefined}
      label={question.key === "budget" ? "No limit" : "No preference"}
      selected={!draft[question.key]}
      onPress={() => clearAnswer(question.key)}
    />
  );
  return (
    <View style={s.controlsStack}>
      {question.key === "type" ? (
        <View testID="matcher-choices" style={s.choicesGrid}>
          {(Object.keys(LISTING_TYPE_LABELS) as ListingType[]).map((type) => (
            <PreferenceChip
              mobileVariant={mobileVariant}
              key={type}
              tile
              icon={TYPE_ICONS[type]}
              label={LISTING_TYPE_LABELS[type]}
              displayLabel={
                type === "pbsa_building" ? "Student building" : undefined
              }
              selected={draft.type?.value.includes(type)}
              onPress={() => {
                const values = draft.type?.value ?? [];
                const next = values.includes(type)
                  ? values.filter((value) => value !== type)
                  : [...values, type];
                next.length ? answer("type", next) : clearAnswer("type");
              }}
            />
          ))}
          {noPreference}
        </View>
      ) : null}
      {question.key === "budget" ? (
        <View
          style={[
            s.budgetCluster,
            Platform.OS === "web" && ({ width: "fit-content" } as object),
          ]}
        >
          <View style={[s.stepper, mobile && s.mobileStepper]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease maximum rent by 50 dollars"
              onPress={() =>
                answer("budget", {
                  min: draft.budget?.value.min ?? null,
                  max: Math.max(
                    draft.budget?.value.min ?? 50,
                    50,
                    (draft.budget?.value.max ?? 500) - 50,
                  ),
                })
              }
              style={({ hovered, pressed }) => [
                s.stepperButton,
                (hovered || pressed) && s.softHover,
              ]}
            >
              <Minus size={18} color={Skoun.color.ink} />
            </Pressable>
            <BudgetAmountField
              mobile={mobile}
              min={draft.budget?.value.min ?? null}
              max={draft.budget?.value.max ?? null}
              onCommit={(next) => {
                const floor = draft.budget?.value.min ?? null;
                answer("budget", {
                  min: floor != null && next >= floor ? floor : null,
                  max: next,
                });
              }}
              onClear={() => clearAnswer("budget")}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase maximum rent by 50 dollars"
              onPress={() =>
                answer("budget", {
                  min: draft.budget?.value.min ?? null,
                  max: Math.max(
                    draft.budget?.value.min ?? 0,
                    (draft.budget?.value.max ?? 500) + 50,
                  ),
                })
              }
              style={({ hovered, pressed }) => [
                s.stepperButton,
                (hovered || pressed) && s.softHover,
              ]}
            >
              <Plus size={18} color={Skoun.color.ink} />
            </Pressable>
          </View>
          <View style={[s.chips, s.budgetPresets, mobile && s.mobileBudgetPresets]}>
            {[300, 500, 750, 1000].map((amount) => (
              <PreferenceChip
                hug
                mobileVariant={mobileVariant}
                key={amount}
                label={"Up to $" + amount}
                displayLabel={"$" + amount}
                selected={
                  draft.budget?.value.max === amount &&
                  draft.budget.value.min == null
                }
                onPress={() => answer("budget", { min: null, max: amount })}
              />
            ))}
            <PreferenceChip
              hug
              mobileVariant={mobileVariant}
              label="No limit"
              selected={!draft.budget}
              onPress={() => clearAnswer("budget")}
            />
          </View>
        </View>
      ) : null}
      {question.key === "location" ? (
        <LocationPicker
          mobile={mobile}
          onSearchFocusChange={onLocationFocusChange}
          value={draft.location?.value}
          onSelect={(value) => answer("location", value)}
          onClear={() => clearAnswer("location")}
        />
      ) : null}
      {question.key === "gender" ? (
        <View style={mobile ? s.mobileOptionRows : s.chips}>
          {(["girls_only", "boys_only"] as const).map((gender) => (
            <PreferenceChip
              mobileVariant={mobileVariant}
              key={gender}
              label={
                gender === "girls_only"
                  ? "Girls-only listings"
                  : "Boys-only listings"
              }
              selected={draft.gender?.value.includes(gender)}
              onPress={() => answer("gender", [gender])}
            />
          ))}
          {noPreference}
        </View>
      ) : null}
      {question.key === "power" ? (
        <View style={mobile ? s.mobileOptionRows : s.chips}>
          <PreferenceChip
            mobileVariant={mobileVariant}
            icon={Sun}
            label="Solar"
            selected={draft.power?.value.join() === "solar"}
            onPress={() => answer("power", ["solar"])}
          />
          <PreferenceChip
            mobileVariant={mobileVariant}
            icon={Zap}
            label="Solar or 24/7 generator"
            selected={
              draft.power?.value.length === 2 &&
              draft.power.value.includes("solar") &&
              draft.power.value.includes("generator_24_7")
            }
            onPress={() => answer("power", ["solar", "generator_24_7"])}
          />
          {draft.power?.value.includes("scheduled_cuts") ? (
            <PreferenceChip
              mobileVariant={mobileVariant}
              label="Scheduled cuts (existing filter)"
              selected
              onPress={() => clearAnswer("power")}
            />
          ) : null}
          {draft.power?.value.join() === "generator_24_7" ? (
            <PreferenceChip
              mobileVariant={mobileVariant}
              label="24/7 generator (existing filter)"
              selected
              onPress={() => clearAnswer("power")}
            />
          ) : null}
          {noPreference}
        </View>
      ) : null}
      {question.key === "wifi" ? (
        <View style={mobile ? s.mobileOptionRows : s.chips}>
          <PreferenceChip
            mobileVariant={mobileVariant}
            icon={Wifi}
            label="Wi-Fi included"
            selected={!!draft.wifi}
            onPress={() => answer("wifi", true)}
          />
          {noPreference}
        </View>
      ) : null}
    </View>
  );
}

function UnderContinue({
  editing,
  question,
  draft,
  update,
  onPartial,
}: {
  editing: boolean;
  question: (typeof QUESTIONS)[number];
  draft: MatcherPreferences;
  update: (next: MatcherPreferences) => void;
  onPartial: () => void;
}) {
  return (
    <>
      <ImportanceNote question={question} draft={draft} update={update} />
      {editing ? (
        <Text style={s.importanceHint}>
          Your other answers stay just as they are.
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show what I have so far"
          onPress={onPartial}
          style={({ pressed, hovered }) => [
            s.railLink,
            (pressed || hovered) && s.softHover,
          ]}
        >
          <Text style={s.partialText}>See matches so far</Text>
          <ArrowUpRight size={12} color={Skoun.color.inkMuted} />
        </Pressable>
      )}
    </>
  );
}

function hoverAvailable() {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches
  );
}

function useHoverCapability() {
  const [canHover, setCanHover] = useState(hoverAvailable);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window.matchMedia !== "function") {
      setCanHover(false);
      return;
    }
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return canHover;
}

function importanceCopy(
  importance: "prefer" | "required",
  radiusNote: string,
) {
  if (importance === "required") {
    return "Only places that meet this." + radiusNote;
  }
  return "Prioritised in your matches.\nOther options stay visible.";
}

function ImportanceNote({
  question,
  draft,
  update,
  mobile = false,
}: {
  question: (typeof QUESTIONS)[number];
  draft: MatcherPreferences;
  update: (next: MatcherPreferences) => void;
  mobile?: boolean;
}) {
  const canHover = useHoverCapability();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [peek, setPeek] = useState<"prefer" | "required" | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );
  const hidden = !draft[question.key] || question.key === "gender";
  const selected = draft[question.key]?.importance ?? "prefer";
  const radiusNote =
    question.key === "location" && draft.location?.value.kind === "campus"
      ? " Within " + (draft.location.value.radiusKm ?? 2) + " km."
      : "";
  const showHint = !canHover || hovered || focused;
  return (
    <View
      style={[
        s.importance,
        mobile && s.mobileImportance,
        hidden && s.importanceReserved,
      ]}
      pointerEvents={hidden ? "none" : "auto"}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      {...(hidden && Platform.OS === "web" ? ({ "aria-hidden": true } as object) : {})}
      {...(!hidden && Platform.OS === "web"
        ? {
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => {
              setHovered(false);
              setPeek(null);
            },
          }
        : {})}
    >
      <View style={mobile && s.mobileImportanceCopy}>
        <Text style={[s.importanceLabel, mobile && s.mobileImportanceLabel]}>
          How important?
        </Text>
        {mobile ? (
          <Text style={s.mobileImportanceHint}>
            {selected === "required"
              ? "Only matching places." + radiusNote
              : "Keep other options open."}
          </Text>
        ) : null}
      </View>
      <View style={s.importanceSegment}>
        {(["prefer", "required"] as const).map((importance) => (
          <Pressable
            key={importance}
            accessibilityRole="button"
            accessibilityLabel={
              importance === "prefer" ? "Prefer" : "Must have"
            }
            accessibilityHint={importanceCopy(importance, radiusNote)}
            accessibilityState={{ selected: selected === importance }}
            aria-pressed={selected === importance}
            onHoverIn={() => setPeek(importance)}
            onHoverOut={() => setPeek(null)}
            onFocus={() => {
              if (blurTimer.current) clearTimeout(blurTimer.current);
              setPeek(importance);
              setFocused(true);
            }}
            onBlur={() => {
              blurTimer.current = setTimeout(() => {
                setPeek(null);
                setFocused(false);
              }, 0);
            }}
            onPress={() => {
              if (hidden || !draft[question.key]) return;
              update({
                ...draft,
                [question.key]: { ...draft[question.key], importance },
              });
            }}
            {...(hidden ? { tabIndex: -1, focusable: false } : {})}
            style={[
              s.segmentOption,
              mobile && s.mobileImportanceOption,
              selected === importance && s.segmentSelected,
            ]}
          >
            <Text
              style={[
                s.segmentText,
                selected === importance && s.segmentTextSelected,
              ]}
            >
              {importance === "prefer" ? "Prefer" : "Must have"}
            </Text>
          </Pressable>
        ))}
      </View>
      {!mobile ? <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[
          s.importanceHint,
          canHover && s.importanceHintFloat,
          canHover && !showHint && s.importanceHintHidden,
        ]}
      >
        {importanceCopy(peek ?? selected, radiusNote)}
      </Text> : null}
    </View>
  );
}

function FooterSizer({
  reduced,
  children,
}: {
  reduced: boolean;
  children: ReactNode;
}) {
  const [height, setHeight] = useState<number | null>(null);
  return (
    <View
      style={[
        { flexShrink: 0 },
        height != null && { height, overflow: "hidden" },
        Platform.OS === "web" &&
          !reduced &&
          height != null && {
            transitionProperty: "height",
            transitionDuration: "200ms",
            transitionTimingFunction: "ease",
          },
      ]}
    >
      <View
        style={{ flexShrink: 0 }}
        onLayout={(event) => {
          const next = Math.ceil(event.nativeEvent.layout.height);
          setHeight((current) => (current === next ? current : next));
        }}
      >
        {children}
      </View>
    </View>
  );
}

export function MatcherSheet(props: Props) {
  const [mounted, setMounted] = useState(props.visible);
  const handleExited = useCallback(() => setMounted(false), []);
  useEffect(() => {
    if (props.visible) setMounted(true);
  }, [props.visible]);
  if (!mounted) return null;
  return <MatcherSession {...props} onExited={handleExited} />;
}

function MatcherSession({
  visible,
  filters,
  applied,
  firstName,
  onClose,
  onApply,
  onExited,
}: Props & { onExited: () => void }) {
  const universities = useUniversities();
  const parentInsets = useSafeAreaInsets();
  const [insets, setModalInsets] = useState(parentInsets);
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const desktop = Platform.OS === "web" && width >= 768;
  const wideFooter = width >= 720;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [locationSearchFocused, setLocationSearchFocused] = useState(false);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const [draft, setDraft] = useState<MatcherPreferences>(() =>
    prefillPreferences(filters, universities.data ?? [], applied),
  );
  const [composer, setComposer] = useState<MatcherPreferences>(() =>
    prefillPreferences(filters, universities.data ?? [], applied),
  );
  const resumeFinished = hasAnswers(applied);
  const [step, setStep] = useState(resumeFinished ? QUESTIONS.length : 0);
  const [revealed, setRevealed] = useState(resumeFinished ? QUESTIONS.length : -1);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const dirty = useRef(false);
  const abandonedRestart = useRef(false);
  const editBase = useRef(draft);
  const returnComposer = useRef(composer);
  const latestToSave = useRef(composer);
  const scroll = useRef<ScrollView>(null);
  const followLatest = useRef(true);
  const promptRef = useRef<Text>(null);
  const dialogRef = useRef<View>(null);
  const closing = useRef(false);
  const slide = useRef(new Animated.Value(reduced ? 0 : 1)).current;
  const done = step === QUESTIONS.length;
  const thinking = editingStep == null && revealed < step;
  const activeIndex = editingStep ?? Math.min(step, QUESTIONS.length - 1);
  const question = QUESTIONS[activeIndex];
  const locationKeyboardOpen = !wideFooter && !thinking &&
    (!done || editingStep != null) && question.key === "location" &&
    (Platform.OS === "web" ? locationSearchFocused : keyboardVisible);
  const existing = existingFilterLabels(filters);
  const draftContext = JSON.stringify({ filters, applied });
  const greetingName = firstName?.trim();
  latestToSave.current =
    editingStep == null ? composer : returnComposer.current;

  useEffect(() => {
    let live = true;
    void readMatcherPreferences().then((saved) => {
      if (live && !dirty.current) {
        const next =
          saved.draftContext === draftContext && saved.draft
            ? saved.draft
            : prefillPreferences(
                filters,
                universities.data ?? [],
                applied ?? saved.draft ?? saved.applied,
              );
        setDraft(next);
        setComposer(next);
      }
      if (live) setHydrated(true);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const location = draft.location;
    if (location?.value.kind !== "campus" || location.value.center) return;
    const university = universities.data?.find(
      (u) => u.id === location.value.campusId || u.slug === location.value.slug,
    );
    if (university?.lat == null || university.lng == null) return;
    const hydratedLocation = {
      ...location,
      value: { ...location.value, ...campusLocation(university) },
    };
    setDraft((previous) => ({ ...previous, location: hydratedLocation }));
    setComposer((previous) =>
      previous.location?.value.kind === "campus" &&
      !previous.location.value.center &&
      (previous.location.value.campusId === university.id ||
        previous.location.value.slug === university.slug)
        ? { ...previous, location: hydratedLocation }
        : previous,
    );
  }, [universities.data, draft.location]);

  useEffect(() => {
    if (hydrated && dirty.current && editingStep == null)
      void saveMatcherPreferences(composer, "draft", draftContext);
  }, [composer, editingStep, hydrated]);

  useEffect(() => {
    if (visible) closing.current = false;
    const finish = () => {
      if (!visible) onExited();
    };
    if (reduced) {
      slide.setValue(visible ? 0 : 1);
      finish();
      return;
    }
    const animation = Animated.timing(slide, {
      toValue: visible ? 0 : 1,
      duration: 260,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) finish();
    });
    return () => animation.stop();
  }, [visible, reduced, slide, onExited]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (!abandonedRestart.current)
      void saveMatcherPreferences(latestToSave.current, "draft", draftContext);
    onClose();
  };
  const restart = () => {
    const fresh: MatcherPreferences = { version: 1 };
    abandonedRestart.current = true;
    dirty.current = false;
    editBase.current = fresh;
    returnComposer.current = fresh;
    latestToSave.current = fresh;
    setEditingStep(null);
    setDraft(fresh);
    setComposer(fresh);
    setStep(0);
    setRevealed(-1);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key !== "Tab") return;
      const node = dialogRef.current as unknown as HTMLElement | null;
      const focusable = Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),[tabindex="0"]',
        ) ?? [],
      ).filter(
        (el) =>
          el.getClientRects().length > 0 &&
          el.getAttribute("aria-disabled") !== "true",
      );
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !node?.contains(document.activeElement))
      ) {
        e.preventDefault();
        last?.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !node?.contains(document.activeElement))
      ) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (!thinking) return;
    const timer = setTimeout(() => setRevealed(step), 2000);
    return () => clearTimeout(timer);
  }, [thinking, step]);

  useEffect(() => {
    followLatest.current = true;
    const previousFocus = Platform.OS === "web" ? document.activeElement : null;
    const timer = setTimeout(() => {
      scroll.current?.scrollToEnd({ animated: !reduced });
      if (Platform.OS === "web") {
        if (document.activeElement === previousFocus)
          (promptRef.current as unknown as HTMLElement)?.focus?.({
            preventScroll: true,
          });
      } else {
        const node = findNodeHandle(promptRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [step, editingStep, reduced, revealed]);

  const updateComposer = (next: MatcherPreferences) => {
    dirty.current = true;
    abandonedRestart.current = false;
    setComposer(next);
  };
  const clearAnswer = (d: Dimension) => {
    const next = { ...composer };
    delete next[d];
    updateComposer(next);
  };
  const answer = (d: Dimension, value: unknown) =>
    updateComposer({
      ...composer,
      [d]: {
        value,
        importance:
          d === "gender" ? "required" : (composer[d]?.importance ?? "prefer"),
      },
    });

  const commitDraft = (next: MatcherPreferences) => {
    dirty.current = true;
    setDraft(next);
    void saveMatcherPreferences(next, "draft", draftContext);
  };

  const continueConversation = () => {
    commitDraft(composer);
    setStep((current) => Math.min(current + 1, QUESTIONS.length));
  };

  const skipQuestion = () => {
    const next = { ...composer };
    delete next[question.key];
    updateComposer(next);
    commitDraft(next);
    setStep((current) => Math.min(current + 1, QUESTIONS.length));
  };

  const beginEdit = (
    index: number,
    base: MatcherPreferences = draft,
    resume: MatcherPreferences = composer,
  ) => {
    editBase.current = base;
    if (editingStep == null) returnComposer.current = resume;
    setComposer(base);
    setEditingStep(index);
  };

  const cancelEdit = () => {
    setComposer(returnComposer.current);
    setEditingStep(null);
  };

  const saveEdit = () => {
    if (editingStep == null) return;
    const dimension = QUESTIONS[editingStep].key;
    const committed = replaceDimension(editBase.current, composer, dimension);
    const resumed = replaceDimension(
      returnComposer.current,
      composer,
      dimension,
    );
    commitDraft(committed);
    setComposer(resumed);
    setEditingStep(null);
  };

  const goBack = () => {
    if (step === 0) return;
    commitDraft(composer);
    beginEdit(step - 1, composer, composer);
  };

  const apply = (preferences: MatcherPreferences) => {
    void saveMatcherPreferences(preferences, "applied");
    onApply(preferences);
  };

  const drawerDistance = Math.max(width, 560);
  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, drawerDistance],
  });

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <SafeAreaListener
        style={s.overlay}
        onChange={({ insets: modalInsets }) => setModalInsets((current) =>
          current.top === modalInsets.top &&
          current.bottom === modalInsets.bottom &&
          current.left === modalInsets.left &&
          current.right === modalInsets.right
            ? current
            : modalInsets,
        )}
      >
        <Pressable
          accessible={false}
          focusable={false}
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          ref={dialogRef}
          testID="matcher-drawer"
          accessibilityViewIsModal
          style={[
            s.drawer,
            desktop
              ? [s.drawerDesktop, { width: Math.round(width * 0.42) }]
              : s.drawerMobile,
            { transform: [{ translateX }] },
          ]}
        >
          {Platform.OS === "web"
            ? createElement(
                "style",
                null,
                `
            [data-testid="matcher-drawer"] [role="button"]:focus-visible {
              outline: 2px solid #2F6FED;
              outline-offset: 2px;
            }
            [data-testid="matcher-drawer"] input:focus-visible {
              outline: none;
            }
            [data-testid="matcher-choices"] {
              display: grid !important;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              width: 100%;
            }
            [data-testid="matcher-choices"] > * {
              width: auto !important;
              max-width: none !important;
              min-width: 0 !important;
            }
            .skoun-thinking {
              position: relative;
              display: inline-block;
              color: rgba(18, 24, 38, 0.45);
              font-family: DMSans_600SemiBold, sans-serif;
              font-size: 16px;
              line-height: 22px;
              letter-spacing: -0.2px;
            }
            .skoun-thinking::before {
              content: attr(data-text);
              position: absolute;
              inset: 0;
              pointer-events: none;
              background-image: linear-gradient(
                90deg,
                transparent 0%,
                transparent 40%,
                #121826 50%,
                transparent 60%,
                transparent 100%
              );
              background-size: 400% 100%;
              background-repeat: no-repeat;
              -webkit-background-clip: text;
              background-clip: text;
              color: transparent;
              -webkit-text-fill-color: transparent;
              animation: skoun-thinking-shimmer 2000ms linear infinite;
            }
            @keyframes skoun-thinking-shimmer {
              0% { background-position: 100% 0; }
              100% { background-position: 0% 0; }
            }
            @media (prefers-reduced-motion: reduce) {
              [data-testid="matcher-drawer"] * { transition: none !important; }
              .skoun-thinking::before { animation: none !important; }
            }
          `,
              )
            : null}
          <KeyboardAvoidingView
            style={s.drawerInner}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={[s.header, locationKeyboardOpen && s.keyboardHeader, { paddingTop: Math.max(12, insets.top) }]}>
              <View style={[s.headerMark, locationKeyboardOpen && s.keyboardHeaderMark]}>
                <BotAvatar playOnHover size={locationKeyboardOpen ? 32 : 48} />
              </View>
              <View style={s.headerCopy}>
                <Text style={s.title}>Find my place</Text>
                {!locationKeyboardOpen ? <Text style={s.headerSubtitle}>
                  A little guidance from Skoun
                </Text> : null}
              </View>
              <Text
                accessibilityLabel={
                  done
                    ? "All six questions answered"
                    : "Question " + (step + 1) + " of " + QUESTIONS.length
                }
                style={s.progressText}
              >
                {done ? "6 / 6" : step + 1 + " / 6"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restart"
                onPress={restart}
                style={({ pressed, hovered }) => [
                  s.iconButton,
                  (pressed || hovered) && s.softHover,
                ]}
              >
                <RotateCcw
                  size={18}
                  color={Skoun.color.ink}
                  strokeWidth={1.6}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close guide"
                onPress={close}
                style={({ pressed, hovered }) => [
                  s.iconButton,
                  (pressed || hovered) && s.softHover,
                ]}
              >
                <X
                  size={21}
                  color={Skoun.color.ink}
                  strokeWidth={1.6}
                />
              </Pressable>
            </View>
            <View style={s.progressTrack} accessible={false}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: (((step + (done ? 0 : 1)) / QUESTIONS.length) * 100 +
                      "%") as "100%",
                  },
                ]}
              />
            </View>

            <View style={s.menuBody}>
            {!locationKeyboardOpen ? <MenuCubes /> : null}
            <ScrollView
              ref={scroll}
              testID="matcher-transcript"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[s.threadContent, locationKeyboardOpen && s.keyboardThreadContent]}
              style={[s.threadScroll, locationKeyboardOpen && s.keyboardTranscript]}
              onLayout={() => {
                // The answer tray and keyboard can resize the viewport without
                // changing the transcript's content size.
                scroll.current?.scrollToEnd({ animated: false });
              }}
              onContentSizeChange={() => {
                if (followLatest.current)
                  scroll.current?.scrollToEnd({ animated: false });
              }}
              onScroll={(event) => {
                const { layoutMeasurement, contentOffset, contentSize } =
                  event.nativeEvent;
                followLatest.current =
                  contentOffset.y + layoutMeasurement.height >=
                  contentSize.height - 60;
              }}
              scrollEventThrottle={100}
            >
              <View style={[s.conversation, locationKeyboardOpen && s.keyboardConversation]} testID="matcher-messages">
                {!locationKeyboardOpen ? <>
                <BotLine avatar={false}>
                  <Text style={s.greeting}>Hi {greetingName || "there"}!</Text>
                  <Text style={s.welcomeCopy}>
                    I’ll help you find a place that feels right.
                  </Text>
                </BotLine>

                {existing.length ? (
                  <View style={s.existing}>
                    <SlidersHorizontal
                      size={14}
                      color={Skoun.color.inkMuted}
                    />
                    <Text style={s.caption}>
                      Keeping your filters: {existing.join(" · ")}
                    </Text>
                  </View>
                ) : null}

                {QUESTIONS.slice(0, step).map((item, index) => (
                  <View key={item.key} style={s.exchange}>
                    <BotLine avatar>
                      <Text style={s.pastPrompt}>{item.prompt}</Text>
                    </BotLine>
                    <ChatBubble
                      side="right"
                      color={Skoun.color.primaryMist}
                      hoverColor="#DCE7F5"
                      stroke={
                        editingStep === index ? Skoun.color.primary : undefined
                      }
                      tailed
                      onPress={() => beginEdit(index)}
                      accessibilityLabel={
                        "Edit answer to " +
                        item.prompt +
                        ": " +
                        answerLabel(draft, item.key)
                      }
                      accessibilityState={{ selected: editingStep === index }}
                      shadow={{ y: 5, blur: 12, opacity: 0.34 }}
                      style={s.answerBubble}
                    >
                      <View style={s.answerCopy}>
                        <Text style={s.answerText}>
                          {answerLabel(draft, item.key)}
                        </Text>
                        {draft[item.key] ? (
                          <Text style={s.answerMeta}>
                            {draft[item.key]?.importance === "required"
                              ? "Must have"
                              : "Prefer"}
                          </Text>
                        ) : null}
                      </View>
                      <Pencil
                       
                        size={13}
                        color={Skoun.color.inkMuted}
                      />
                    </ChatBubble>
                  </View>
                ))}
                </> : null}

                <View
                  style={s.currentMessage}
                  testID="matcher-current-question"
                >
                  {locationKeyboardOpen ? (
                    <Text accessibilityRole="header" style={s.keyboardQuestionTitle}>
                      {question.prompt}
                    </Text>
                  ) : thinking ? (
                    <BotLine avatar thinking playing>
                      <ThinkingLabel />
                    </BotLine>
                  ) : (
                  <BotLine avatar playing={!done && editingStep == null}>
                    <View style={s.messageCopy}>
                      <Text
                        ref={editingStep == null ? promptRef : undefined}
                        {...(Platform.OS === "web" ? { tabIndex: -1 } : {})}
                        accessibilityRole="header"
                        accessibilityLiveRegion="polite"
                        style={s.prompt}
                      >
                        {done
                          ? "Let’s find your closest matches."
                          : QUESTIONS[step].prompt}
                      </Text>
                      <Text style={s.hint}>
                        {done
                          ? "Your preferences are together. Let’s see which places feel right."
                          : QUESTIONS[step].hint}
                      </Text>
                      {done ? (
                        <View style={s.readyRow}>
                          <Check
                            size={15}
                            color={Skoun.color.primary}
                          />
                          <Text style={s.readyText}>
                            {
                              DIMENSIONS.filter((dimension) => draft[dimension])
                                .length
                            }{" "}
                            preferences ready
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </BotLine>
                  )}
                </View>
              </View>
            </ScrollView>

            <FooterSizer reduced={reduced}>
            <View
              style={[
                s.footer,
                !wideFooter && s.mobileFooter,
                locationKeyboardOpen && s.keyboardFooter,
                {
                  paddingBottom: !wideFooter && keyboardVisible ? 6 : wideFooter
                    ? Math.max(12, insets.bottom + 6)
                    : Math.max(6, insets.bottom),
                },
              ]}
            >
              {!thinking && (editingStep != null || !done) ? !wideFooter ? (
                <>
                  <ScrollView
                    key={activeIndex}
                    testID="matcher-mobile-options"
                    style={[s.mobileOptionsScroll, locationKeyboardOpen && s.keyboardOptionsScroll]}
                    contentContainerStyle={s.mobileOptionsContent}
                    contentInsetAdjustmentBehavior="never"
                    automaticallyAdjustContentInsets={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    <View testID="matcher-composer" style={s.mobileComposer}>
                      {!locationKeyboardOpen ? <View style={s.mobileComposerHeading}>
                        <Text
                          ref={editingStep != null ? promptRef : undefined}
                          {...(Platform.OS === "web" && editingStep != null ? { tabIndex: -1 } : {})}
                          accessibilityRole="header"
                          style={s.mobileComposerTitle}
                        >
                          {editingStep != null ? "Editing · " : ""}{STEP_LABELS[activeIndex]}
                        </Text>
                        <Text style={s.mobileComposerHint}>
                          {STEP_HINTS[activeIndex]}
                        </Text>
                      </View> : null}
                      <MatcherControls
                        mobile
                        onLocationFocusChange={setLocationSearchFocused}
                        question={question}
                        draft={composer}
                        update={updateComposer}
                        answer={answer}
                        clearAnswer={clearAnswer}
                      />
                    </View>
                    {!locationKeyboardOpen ? <ImportanceNote
                      mobile
                      question={question}
                      draft={composer}
                      update={updateComposer}
                    /> : null}
                  </ScrollView>
                  <View
                    style={s.mobileNavigation}
                    onPointerDown={(event) => {
                      if (locationKeyboardOpen && Platform.OS === "web") event.preventDefault();
                    }}
                  >
                    {editingStep != null ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => { Keyboard.dismiss(); cancelEdit(); }}
                        style={({ pressed }) => [s.mobileSkip, pressed && s.softHover]}
                      >
                        <Text style={s.secondaryText}>Cancel</Text>
                      </Pressable>
                    ) : (
                      <>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Back"
                          accessibilityState={{ disabled: step === 0 }}
                          disabled={step === 0}
                          onPress={() => { Keyboard.dismiss(); goBack(); }}
                          style={({ pressed }) => [s.mobileBack, step === 0 && s.disabled, pressed && s.softHover]}
                        >
                          <ArrowLeft size={19} color={Skoun.color.ink} />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => { Keyboard.dismiss(); skipQuestion(); }}
                          style={({ pressed }) => [s.mobileSkip, pressed && s.softHover]}
                        >
                          <Text style={s.secondaryText}>Skip</Text>
                        </Pressable>
                      </>
                    )}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={editingStep != null ? "Save changes" : "Continue"}
                      onPress={() => {
                        Keyboard.dismiss();
                        if (editingStep != null) saveEdit();
                        else continueConversation();
                      }}
                      style={({ pressed }) => [s.primary, s.mobileContinue, pressed && s.primaryHover]}
                    >
                      <Text style={s.mobileContinueText}>
                        {editingStep != null ? "Save changes" : "Continue"}
                      </Text>
                      {editingStep != null
                        ? <Check size={17} color="white" />
                        : <ArrowRight size={17} color="white" />}
                    </Pressable>
                  </View>
                  {locationKeyboardOpen ? null : editingStep != null ? (
                    <Text style={s.mobileFooterHint}>Your other answers stay as they are.</Text>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Show what I have so far"
                      onPress={() => apply(composer)}
                      style={({ pressed }) => [s.mobilePartial, pressed && s.softHover]}
                    >
                      <Text style={s.partialText}>See matches so far</Text>
                      <ArrowUpRight size={13} color={Skoun.color.inkMuted} />
                    </Pressable>
                  )}
                </>
              ) : (
                <>
                <View style={s.footerBand}>
                  <View style={wideFooter ? s.footerRail : s.footerRailStack}>
                    {editingStep != null ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={cancelEdit}
                        style={({ pressed, hovered }) => [
                          s.quietButton,
                          (pressed || hovered) && s.softHover,
                        ]}
                      >
                        <Text style={s.quietText}>Cancel edit</Text>
                      </Pressable>
                    ) : (
                      <>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Back"
                          disabled={step === 0}
                          accessibilityState={{ disabled: step === 0 }}
                          onPress={goBack}
                          style={({ pressed, hovered }) => [
                            s.backTiny,
                            step === 0 && s.disabled,
                            (pressed || hovered) && step > 0 && s.softHover,
                          ]}
                        >
                          <ArrowLeft
                            size={15}
                            color={Skoun.color.inkMuted}
                          />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={skipQuestion}
                          style={({ pressed, hovered }) => [
                            s.quietButton,
                            (pressed || hovered) && s.softHover,
                          ]}
                        >
                          <Text style={s.quietText}>Skip</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                  <View testID="matcher-composer" style={s.footerOptions}>
                    {editingStep != null ? (
                      <Text
                        ref={promptRef}
                        {...(Platform.OS === "web" ? { tabIndex: -1 } : {})}
                        accessibilityRole="header"
                        style={s.editingLabel}
                      >
                        {"Editing · " + STEP_LABELS[editingStep]}
                      </Text>
                    ) : null}
                    <MatcherControls
                      key={activeIndex}
                      question={question}
                      draft={composer}
                      update={updateComposer}
                      answer={answer}
                      clearAnswer={clearAnswer}
                    />
                  </View>
                  <View style={wideFooter ? s.underContinue : s.footerRail}>
                    {editingStep != null ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Save changes"
                        onPress={saveEdit}
                        style={({ pressed, hovered }) => [
                          s.railPrimary,
                          (pressed || hovered) && s.primaryHover,
                        ]}
                      >
                        <Text style={s.railPrimaryText}>Save</Text>
                        <Check size={13} color="white" />
                      </Pressable>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        onPress={continueConversation}
                        style={({ pressed, hovered }) => [
                          s.railPrimary,
                          (pressed || hovered) && s.primaryHover,
                        ]}
                      >
                        <Text style={s.railPrimaryText}>Continue</Text>
                        <ArrowRight size={13} color="white" />
                      </Pressable>
                    )}
                    {wideFooter ? (
                      <UnderContinue
                        editing={editingStep != null}
                        question={question}
                        draft={composer}
                        update={updateComposer}
                        onPartial={() => apply(composer)}
                      />
                    ) : null}
                  </View>
                </View>
                {wideFooter ? null : (
                  <View style={s.underContinueBelow}>
                    <UnderContinue
                      editing={editingStep != null}
                      question={question}
                      draft={composer}
                      update={updateComposer}
                      onPartial={() => apply(composer)}
                    />
                  </View>
                )}
                </>
              ) : null}
              {done && !thinking ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => apply(draft)}
                    style={({ pressed, hovered }) => [
                      s.primary,
                      (pressed || hovered) && s.primaryHover,
                    ]}
                  >
                    <Text style={s.entryText}>Find my best matches</Text>
                    <ArrowRight size={18} color="white" />
                  </Pressable>
                  <Text style={s.footerHint}>
                    You can edit any answer above.
                  </Text>
                </>
              ) : null}
            </View>
            </FooterSizer>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaListener>
    </Modal>
  );
}
