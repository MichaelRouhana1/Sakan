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
  Search,
  SlidersHorizontal,
  Sun,
  Wifi,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: LucideIcon;
  displayLabel?: string;
  tile?: boolean;
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
        selected && s.chipSelected,
        (pressed || hovered) && s.chipHover,
      ]}
    >
      {Icon ? (
        <Icon
         
          size={17}
          strokeWidth={1.6}
          color={selected ? Skoun.color.primary : Skoun.color.inkMuted}
        />
      ) : null}
      <Text style={[s.chipText, selected && s.chipTextSelected]}>
        {displayLabel ?? label}
      </Text>
      {selected && !tile ? (
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
      <Ionicons
       
        aria-hidden={true}
        name="compass-outline"
        size={20}
        color="white"
      />
      <Text style={s.entryText}>{label}</Text>
    </Pressable>
  );
}

function LocationPicker({
  value,
  onSelect,
}: {
  value?: MatchLocation;
  onSelect: (location: MatchLocation) => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"campus" | "area">(value?.kind ?? "campus");
  const [searching, setSearching] = useState(!value);
  const [fieldFocused, setFieldFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
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
    if (!searching) return;
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
    kind === "campus"
      ? (universities.data ?? [])
          .filter((university) =>
            [
              university.name,
              university.displayName,
              university.institutionName,
              university.institutionShortName,
            ].some((name) => name?.toLowerCase().includes(needle)),
          )
          .slice(0, 3)
          .map(campusLocation)
      : areas
          .filter((area) => area.toLowerCase().includes(needle))
          .slice(0, 3)
          .map((area) => ({
            kind: "area",
            label: area,
            areas: [area],
            center: suggestions.data?.areas.find((item) => item.label === area)
              ?.center,
          }));

  if (value && !searching) {
    return (
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
    );
  }
  return (
    <View style={s.locationPicker}>
      <View style={s.segment}>
          {(["campus", "area"] as const).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={option === "campus" ? "Campus" : "Area"}
              aria-pressed={kind === option}
              accessibilityState={{ selected: kind === option }}
              onPress={() => {
                setKind(option);
                setQuery("");
              }}
              style={[s.segmentOption, kind === option && s.segmentSelected]}
            >
              <Text
                style={[
                  s.segmentText,
                  kind === option && s.segmentTextSelected,
                ]}
              >
                {option === "campus" ? "Campus" : "Area"}
              </Text>
            </Pressable>
          ))}
      </View>
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
          onFocus={() => setFieldFocused(true)}
          onBlur={() => setFieldFocused(false)}
          onSubmitEditing={() => {
            const first = choices[0];
            if (!first) return;
            onSelect(first);
            setSearching(false);
          }}
          style={s.input}
          autoCorrect={false}
          returnKeyType="search"
        />
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
                onPress={() => {
                  onSelect(location);
                  setSearching(false);
                }}
                style={({ hovered, pressed }) => [
                  s.locationResult,
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

function MatcherControls({
  question,
  draft,
  update,
  answer,
  clearAnswer,
}: {
  question: (typeof QUESTIONS)[number];
  draft: MatcherPreferences;
  update: (next: MatcherPreferences) => void;
  answer: (dimension: Dimension, value: unknown) => void;
  clearAnswer: (dimension: Dimension) => void;
}) {
  const noPreference = (
    <PreferenceChip
      tile={question.key === "type"}
      icon={question.key === "type" ? SlidersHorizontal : undefined}
      label={
        question.key === "budget"
          ? "No limit"
          : question.key === "location"
            ? "Anywhere"
            : "No preference"
      }
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
        <View style={s.controlsStack}>
          <View style={s.stepper}>
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
            <View style={s.budgetCopy}>
              <Text style={s.budgetAmount}>
                {answerLabel(draft, "budget").replace("/month", "")}
              </Text>
              <Text style={s.caption}>USD / month</Text>
            </View>
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
          <View style={s.chips}>
            {[300, 500, 750, 1000].map((amount) => (
              <PreferenceChip
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
            {noPreference}
          </View>
        </View>
      ) : null}
      {question.key === "location" ? (
        <View style={s.controlsStack}>
          <LocationPicker
            key={draft.location ? "selected" : "empty"}
            value={draft.location?.value}
            onSelect={(value) => answer("location", value)}
          />
          {noPreference}
        </View>
      ) : null}
      {question.key === "gender" ? (
        <View style={s.chips}>
          {(["girls_only", "boys_only"] as const).map((gender) => (
            <PreferenceChip
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
        <View style={s.chips}>
          <PreferenceChip
            icon={Sun}
            label="Solar"
            selected={draft.power?.value.join() === "solar"}
            onPress={() => answer("power", ["solar"])}
          />
          <PreferenceChip
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
              label="Scheduled cuts (existing filter)"
              selected
              onPress={() => clearAnswer("power")}
            />
          ) : null}
          {draft.power?.value.join() === "generator_24_7" ? (
            <PreferenceChip
              label="24/7 generator (existing filter)"
              selected
              onPress={() => clearAnswer("power")}
            />
          ) : null}
          {noPreference}
        </View>
      ) : null}
      {question.key === "wifi" ? (
        <View style={s.chips}>
          <PreferenceChip
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

function ImportanceNote({
  question,
  draft,
  update,
}: {
  question: (typeof QUESTIONS)[number];
  draft: MatcherPreferences;
  update: (next: MatcherPreferences) => void;
}) {
  if (!draft[question.key] || question.key === "gender") return null;
  const selected = draft[question.key]?.importance;
  return (
    <View style={s.importance}>
      <Text style={s.importanceLabel}>How important?</Text>
      <View style={s.importanceSegment}>
        {(["prefer", "required"] as const).map((importance) => (
          <Pressable
            key={importance}
            accessibilityRole="button"
            accessibilityLabel={
              importance === "prefer" ? "Prefer" : "Must have"
            }
            accessibilityState={{ selected: selected === importance }}
            aria-pressed={selected === importance}
            onPress={() =>
              update({
                ...draft,
                [question.key]: { ...draft[question.key], importance },
              })
            }
            style={[
              s.segmentOption,
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
      <Text style={s.importanceHint}>
        {selected === "required"
          ? "Only places that meet this."
          : "Prioritised in your matches.\nOther options stay visible."}
        {question.key === "location" &&
        draft.location?.value.kind === "campus" &&
        selected === "required"
          ? " Within " + (draft.location.value.radiusKm ?? 2) + " km."
          : ""}
      </Text>
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const desktop = Platform.OS === "web" && width >= 768;
  const wideFooter = width >= 720;
  const [draft, setDraft] = useState<MatcherPreferences>(() =>
    prefillPreferences(filters, universities.data ?? [], applied),
  );
  const [composer, setComposer] = useState<MatcherPreferences>(() =>
    prefillPreferences(filters, universities.data ?? [], applied),
  );
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(-1);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const dirty = useRef(false);
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
    void saveMatcherPreferences(latestToSave.current, "draft", draftContext);
    onClose();
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
      <View style={s.overlay}>
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
            <View style={[s.header, { paddingTop: Math.max(12, insets.top) }]}>
              <View style={s.headerMark}>
                <BotAvatar playOnHover size={48} />
              </View>
              <View style={s.headerCopy}>
                <Text style={s.title}>Find my place</Text>
                <Text style={s.headerSubtitle}>
                  A little guidance from Skoun
                </Text>
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
            <MenuCubes />
            <ScrollView
              ref={scroll}
              testID="matcher-transcript"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.threadContent}
              style={s.threadScroll}
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
              <View style={s.conversation} testID="matcher-messages">
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

                <View
                  style={s.currentMessage}
                  testID="matcher-current-question"
                >
                  {thinking ? (
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

            <View
              style={[
                s.footer,
                { paddingBottom: Math.max(12, insets.bottom + 6) },
              ]}
            >
              {!thinking && (editingStep != null || !done) ? (
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
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}
