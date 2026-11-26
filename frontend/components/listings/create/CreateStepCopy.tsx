import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { useDesktopDesign, useLayoutWidth } from "@/components/ui/DesktopDesign";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import {
  WizardFieldLabel,
  useWizardFieldInvalid,
  wizardInputStyle,
} from "@/components/listings/create/WizardField";
import { HIGHLIGHT_TAG_OPTIONS } from "@/constants/listingWizard";
import { Lister } from "@/constants/listerTheme";
import { useListingForm } from "@/features/listings/forms/ListingFormContext";
import {
  COPY_DESCRIPTION_MIN,
  COPY_TITLE_MAX,
  COPY_TITLE_MIN,
} from "@/features/listings/create/validators";
import { useUniversities } from "@/features/universities/useUniversities";
import { listingCopyFacts } from "@/features/listings/create/listingCopyFacts";
import { useListingCopy } from "@/features/listings/create/useListingCopy";
import type { CopyMode } from "@/features/listings/create/listingCopyTemplates";
import { useReducedMotion } from "@/lib/useReducedMotion";

export type CopyLook = "1" | "2";

const LOOK_STORAGE_KEY = "studently.copyVariant";
const LOOK_VARIANTS: readonly CopyLook[] = ["1", "2"];

function readInitialCopyLook(): CopyLook {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(LOOK_STORAGE_KEY);
      if (saved === "1" || saved === "2") return saved;
    } catch {
      /* ignore private mode */
    }
  }
  return "2";
}

export function useCopyLook(): [CopyLook, (next: CopyLook) => void] {
  const [look, setLookState] = useState<CopyLook>(readInitialCopyLook);

  function setLook(next: CopyLook) {
    setLookState(next);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOOK_STORAGE_KEY, next);
      } catch {
        /* ignore private mode */
      }
    }
  }

  return [look, setLook];
}

export function CopyLookToggle({
  look,
  onChange,
}: {
  look: CopyLook;
  onChange: (next: CopyLook) => void;
}) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);

  return (
    <View
      testID="copy-look-toggle"
      accessibilityRole="radiogroup"
      accessibilityLabel="Copy step design variant"
      style={styles.toggleTrack}
    >
      {LOOK_VARIANTS.map((mode) => {
        const active = look === mode;
        return (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityLabel={`Design ${mode}`}
            accessibilityState={{ checked: active }}
            onPress={() => onChange(mode)}
            style={[styles.toggleItem, active && styles.toggleItemActive]}
          >
            <LText
              variant="caption"
              style={[styles.toggleLabel, active && styles.toggleLabelActive]}
            >
              {mode}
            </LText>
          </Pressable>
        );
      })}
    </View>
  );
}

const HIGHLIGHT_SUB: Record<string, string> = {
  walk_to_campus: "Close to university gates",
  power_24_7: "Uninterrupted electricity",
  fiber: "Fast wired or fiber line",
  quiet_area: "Calm residential street",
  newly_renovated: "Fresh interior finishes",
};

function pairItems<T>(items: T[]): [T, T | null][] {
  const rows: [T, T | null][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i], items[i + 1] ?? null]);
  }
  return rows;
}

/** Pure RN checkmark so test harnesses without vector-icon font loaders bundle cleanly. */
function CheckGlyph() {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  return <View style={styles.checkGlyph} />;
}

export function CreateStepCopy({ look = "2" }: { look?: CopyLook } = {}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const layoutWidth = useLayoutWidth();
  const reducedMotion = useReducedMotion();
  const twoColTags = layoutWidth >= 360;
  const showToolbarHint = layoutWidth >= 480;

  const { draft, patch } = useListingForm();
  const titleInvalid = useWizardFieldInvalid("title");
  const descriptionInvalid = useWizardFieldInvalid("description");
  const titleLen = draft.title.trim().length;
  const descriptionLen = draft.description.trim().length;
  const campuses = useUniversities();
  const uni = (campuses.data ?? []).find((c) => c.id === draft.primaryCampusId);
  const copy = useListingCopy(
    listingCopyFacts(draft, uni),
    draft.title,
    draft.description,
    patch,
  );
  const [focusedField, setFocusedField] = useState<"title" | "description" | null>(null);

  const aiNote = (
    <LText variant="caption" style={styles.v2AiNote}>
      AI suggestion — edit before publishing
    </LText>
  );

  function toggleTag(slug: string) {
    patch({
      highlightTags: draft.highlightTags.includes(slug)
        ? draft.highlightTags.filter((s) => s !== slug)
        : [...draft.highlightTags, slug],
    });
  }

  /* Design 1: Original pill actions + bare inputs */
  if (look === "1") {
    const aiNoteClassic = (
      <LText variant="caption" tone="muted">
        AI suggestion — edit before publishing
      </LText>
    );

    function action(mode: Exclude<CopyMode, "all">, label: string) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: copy.disabled, busy: copy.busy === mode }}
          aria-busy={copy.busy === mode}
          disabled={copy.disabled}
          onPress={() => void copy.suggest(mode)}
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed,
            copy.disabled && styles.actionDisabled,
          ]}
        >
          {copy.busy === mode ? (
            <ActivityIndicator size="small" color={Lister.color.primary} />
          ) : null}
          <LText variant="caption" tone="primary">
            {label}
          </LText>
        </Pressable>
      );
    }

    function preview(field: "title" | "description") {
      const pending = copy.pending;
      if (!pending || (pending.mode === "title" ? "title" : "description") !== field)
        return null;
      const label =
        pending.mode === "title"
          ? "Replace title"
          : pending.mode === "brief"
            ? "Replace first paragraph"
            : "Replace description";
      return (
        <View style={styles.preview} accessibilityLiveRegion="polite">
          <LText variant="caption" tone="muted">
            Suggested {pending.mode === "description" ? "description" : pending.mode}
          </LText>
          <LText>{pending.result[pending.mode]}</LText>
          {pending.result.source === "gemini" ? aiNoteClassic : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={copy.apply}
              style={styles.action}
            >
              <LText variant="caption" tone="primary">
                {label}
              </LText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={copy.cancel}
              style={styles.action}
            >
              <LText variant="caption" tone="muted">
                Cancel
              </LText>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={{ gap: designSize(16) }}>
        <Enter>
          <WizardFieldLabel required>Title</WizardFieldLabel>
          <View style={styles.actions}>{action("title", "Suggest title")}</View>
          <TextInput
            accessibilityLabel="Listing title"
            placeholder="Describe the space and area"
            placeholderTextColor={Lister.color.inkFaint}
            value={draft.title}
            onChangeText={(title) => patch({ title })}
            maxLength={COPY_TITLE_MAX}
            style={wizardInputStyle(titleInvalid, designSize)}
          />
          <LText
            variant="caption"
            tone={
              titleInvalid || (titleLen > 0 && titleLen < COPY_TITLE_MIN)
                ? "danger"
                : "muted"
            }
          >
            {titleLen}/{COPY_TITLE_MAX} · min {COPY_TITLE_MIN}
          </LText>
          {copy.titleIsAi ? aiNoteClassic : null}
          {preview("title")}
        </Enter>
        <Enter delay={80}>
          <LText variant="subtitle">Highlights</LText>
          <View style={styles.tags}>
            {HIGHLIGHT_TAG_OPTIONS.map((opt) => {
              const on = draft.highlightTags.includes(opt.slug);
              return (
                <Pressable
                  key={opt.slug}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => toggleTag(opt.slug)}
                  style={[styles.tag, on && styles.tagOn]}
                >
                  <LText variant="caption" style={on ? styles.tagLabelOn : undefined}>
                    {opt.label}
                  </LText>
                </Pressable>
              );
            })}
          </View>
        </Enter>
        <Enter delay={140}>
          <WizardFieldLabel required>Description</WizardFieldLabel>
          <View style={styles.actions}>
            {action("brief", "Suggest brief")}
            {action("description", "Suggest full description")}
          </View>
          <LText variant="caption" tone="muted">
            A brief becomes your first paragraph. Full descriptions add the details you
            selected.
          </LText>
          <TextInput
            accessibilityLabel="Listing description"
            placeholder="Layout, power, water, Wi-Fi, and rental terms…"
            placeholderTextColor={Lister.color.inkFaint}
            value={draft.description}
            onChangeText={(description) => patch({ description })}
            multiline
            style={[wizardInputStyle(descriptionInvalid, designSize), styles.area]}
          />
          <LText
            variant="caption"
            tone={
              descriptionInvalid ||
              (descriptionLen > 0 && descriptionLen < COPY_DESCRIPTION_MIN)
                ? "danger"
                : "muted"
            }
          >
            {descriptionLen} characters · min {COPY_DESCRIPTION_MIN}
          </LText>
          {copy.descriptionIsAi ? aiNoteClassic : null}
          {preview("description")}
          {copy.notice ? (
            <LText variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {copy.notice}
            </LText>
          ) : null}
        </Enter>
      </View>
    );
  }

  /* Design 2: Architectural editorial listing composer */
  function suggestBtn(mode: Exclude<CopyMode, "all">, label: string) {
    const busy = copy.busy === mode;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: copy.disabled, busy }}
        aria-busy={busy}
        disabled={copy.disabled}
        hitSlop={4}
        onPress={() => void copy.suggest(mode)}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.v2SuggestBtn,
          !reducedMotion && webTransition,
          hovered && !copy.disabled && styles.v2SuggestBtnHover,
          pressed && !copy.disabled && styles.pressed,
          copy.disabled && styles.actionDisabled,
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={Lister.color.primary} />
        ) : null}
        <LText variant="caption" style={styles.v2SuggestBtnText}>
          {label}
        </LText>
      </Pressable>
    );
  }

  function renderPreview(field: "title" | "description") {
    const pending = copy.pending;
    if (!pending || (pending.mode === "title" ? "title" : "description") !== field)
      return null;
    const applyLabel =
      pending.mode === "title"
        ? "Replace title"
        : pending.mode === "brief"
          ? "Replace first paragraph"
          : "Replace description";
    const heading =
      pending.mode === "title"
        ? "Suggested title"
        : pending.mode === "brief"
          ? "Suggested opening paragraph"
          : "Suggested description";
    return (
      <View style={styles.v2PreviewCard} accessibilityLiveRegion="polite">
        <View style={styles.v2PreviewHeader}>
          <LText variant="caption" style={styles.v2PreviewHeading}>
            {heading}
          </LText>
          {pending.result.source === "gemini" ? aiNote : null}
        </View>
        <View style={styles.v2PreviewBody}>
          <LText style={styles.v2PreviewText}>{pending.result[pending.mode]}</LText>
        </View>
        <View style={styles.v2PreviewFooter}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={applyLabel}
            onPress={copy.apply}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.v2PreviewPrimary,
              !reducedMotion && webTransition,
              hovered && styles.v2PreviewPrimaryHover,
              pressed && styles.pressed,
            ]}
          >
            <LText variant="caption" style={styles.v2PreviewPrimaryText}>
              {applyLabel}
            </LText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={copy.cancel}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.v2PreviewCancel,
              !reducedMotion && webTransition,
              hovered && styles.v2SuggestBtnHover,
              pressed && styles.pressed,
            ]}
          >
            <LText variant="caption" style={styles.v2PreviewCancelText}>
              Cancel
            </LText>
          </Pressable>
        </View>
      </View>
    );
  }

  const titleShort = titleLen > 0 && titleLen < COPY_TITLE_MIN;
  const titleError = titleInvalid || titleShort;
  const descShort = descriptionLen > 0 && descriptionLen < COPY_DESCRIPTION_MIN;
  const descError = descriptionInvalid || descShort;
  const highlightRows = twoColTags
    ? pairItems(HIGHLIGHT_TAG_OPTIONS)
    : HIGHLIGHT_TAG_OPTIONS.map((opt) => [opt, null] as [(typeof HIGHLIGHT_TAG_OPTIONS)[number], null]);
  const selectedTagCount = draft.highlightTags.length;

  return (
    <View style={styles.v2Root} testID="copy-v2">
      {/* 1. Listing title */}
      <View style={styles.v2Section}>
        <View style={styles.v2SectionHeader}>
          <View style={styles.v2SectionHeadingStack}>
            <WizardFieldLabel required>Title</WizardFieldLabel>
            <LText variant="caption" style={styles.v2Muted}>
              Lead with the space type, neighborhood, and one standout perk.
            </LText>
          </View>
          {suggestBtn("title", "Suggest title")}
        </View>

        <View
          style={[
            styles.v2ComposerShell,
            focusedField === "title" && !titleError && styles.v2ComposerFocused,
            titleError && styles.v2ComposerInvalid,
          ]}
        >
          <TextInput
            accessibilityLabel="Listing title"
            placeholder="e.g. Sunny 2-bed apartment near AUB"
            placeholderTextColor={Lister.color.inkMuted}
            value={draft.title}
            onFocus={() => setFocusedField("title")}
            onBlur={() => setFocusedField((f) => (f === "title" ? null : f))}
            onChangeText={(title) => patch({ title })}
            maxLength={COPY_TITLE_MAX}
            style={styles.v2TitleInput}
          />
          <View style={styles.v2ComposerFooter}>
            <LText
              variant="caption"
              style={titleError ? styles.v2ErrorText : styles.v2FooterHint}
            >
              {titleError
                ? titleLen === 0
                  ? `Add a title (at least ${COPY_TITLE_MIN} characters).`
                  : `${COPY_TITLE_MIN - titleLen} more character${COPY_TITLE_MIN - titleLen === 1 ? "" : "s"} needed.`
                : titleLen >= COPY_TITLE_MIN
                  ? "Clear length for search cards"
                  : `Minimum ${COPY_TITLE_MIN} characters`}
            </LText>
            <LText
              variant="caption"
              style={[styles.v2Counter, titleError && styles.v2ErrorText]}
            >
              {titleLen}/{COPY_TITLE_MAX}
            </LText>
          </View>
        </View>

        {copy.titleIsAi ? aiNote : null}
        {renderPreview("title")}
      </View>

      {/* 2. Highlights */}
      <View style={styles.v2SectionDivided}>
        <View style={styles.v2SectionHeader}>
          <View style={styles.v2SectionHeadingStack}>
            <LText variant="subtitle">Highlights</LText>
            <LText variant="caption" style={styles.v2Muted}>
              Quick badges students notice first—also woven into suggested copy.
            </LText>
          </View>
          {selectedTagCount > 0 ? (
            <LText variant="caption" style={styles.v2CountBadge}>
              {selectedTagCount} selected
            </LText>
          ) : (
            <LText variant="caption" style={styles.v2Muted}>
              Optional
            </LText>
          )}
        </View>

        <View style={styles.v2Shell}>
          {highlightRows.map(([left, right], rowIdx) => {
            const renderCell = (
              opt: (typeof HIGHLIGHT_TAG_OPTIONS)[number],
              isRight: boolean,
            ) => {
              const on = draft.highlightTags.includes(opt.slug);
              return (
                <Pressable
                  key={opt.slug}
                  accessibilityRole="checkbox"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ checked: on }}
                  onPress={() => toggleTag(opt.slug)}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.v2TagCell,
                    isRight && styles.v2ColDivided,
                    !reducedMotion && webTransition,
                    hovered && !on && styles.v2CellHover,
                    on && styles.v2CellSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.v2TagCopy}>
                    <LText
                      variant="caption"
                      style={[styles.v2TagTitle, on && styles.v2TagTitleOn]}
                    >
                      {opt.label}
                    </LText>
                    {HIGHLIGHT_SUB[opt.slug] ? (
                      <LText variant="caption" style={styles.v2TagSub}>
                        {HIGHLIGHT_SUB[opt.slug]}
                      </LText>
                    ) : null}
                  </View>
                  <View style={[styles.v2Checkbox, on && styles.v2CheckboxOn]}>
                    {on ? <CheckGlyph /> : null}
                  </View>
                </Pressable>
              );
            };

            return (
              <View
                key={left.slug}
                style={[styles.v2TagRow, rowIdx > 0 && styles.v2RowDivided]}
              >
                {renderCell(left, false)}
                {twoColTags ? (
                  right ? (
                    renderCell(right, true)
                  ) : (
                    <View style={styles.v2TagSpacer} />
                  )
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      {/* 3. Description studio */}
      <View style={styles.v2SectionDivided}>
        <View style={styles.v2SectionHeadingStack}>
          <WizardFieldLabel required>Description</WizardFieldLabel>
          <LText variant="caption" style={styles.v2Muted}>
            A brief becomes your first paragraph. Full descriptions add the details you selected.
          </LText>
        </View>

        <View
          style={[
            styles.v2ComposerShell,
            focusedField === "description" && !descError && styles.v2ComposerFocused,
            descError && styles.v2ComposerInvalid,
          ]}
        >
          <View style={styles.v2Toolbar}>
            {showToolbarHint ? (
              <LText variant="caption" style={styles.v2ToolbarLabel}>
                Draft from your details
              </LText>
            ) : null}
            <View style={styles.v2ToolbarActions}>
              {suggestBtn("brief", "Suggest brief")}
              {suggestBtn("description", "Suggest full description")}
            </View>
          </View>

          <TextInput
            accessibilityLabel="Listing description"
            placeholder="Layout, power, water, Wi-Fi, and rental terms…"
            placeholderTextColor={Lister.color.inkMuted}
            value={draft.description}
            onFocus={() => setFocusedField("description")}
            onBlur={() => setFocusedField((f) => (f === "description" ? null : f))}
            onChangeText={(description) => patch({ description })}
            multiline
            style={styles.v2DescriptionInput}
          />

          <View style={styles.v2ComposerFooter}>
            <LText
              variant="caption"
              style={descError ? styles.v2ErrorText : styles.v2FooterHint}
            >
              {descError
                ? descriptionLen === 0
                  ? `Add a description (at least ${COPY_DESCRIPTION_MIN} characters).`
                  : `${COPY_DESCRIPTION_MIN - descriptionLen} more character${COPY_DESCRIPTION_MIN - descriptionLen === 1 ? "" : "s"} needed.`
                : descriptionLen >= COPY_DESCRIPTION_MIN
                  ? "Ready for renters"
                  : `Minimum ${COPY_DESCRIPTION_MIN} characters`}
            </LText>
            <LText
              variant="caption"
              style={[styles.v2Counter, descError && styles.v2ErrorText]}
            >
              {descriptionLen} chars · min {COPY_DESCRIPTION_MIN}
            </LText>
          </View>
        </View>

        {copy.descriptionIsAi ? aiNote : null}
        {renderPreview("description")}
        {copy.notice ? (
          <View style={styles.v2NoticeBox} accessibilityLiveRegion="polite">
            <LText variant="caption" style={styles.v2ErrorText}>
              {copy.notice}
            </LText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const webPointer =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : {};

const webTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "border-color, background-color, box-shadow",
        transitionDuration: "140ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      } as unknown as ViewStyle)
    : null;

const baseStyles = StyleSheet.create({
  /* Header 1 | 2 Toggle */
  toggleTrack: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    padding: 3,
    gap: 2,
    borderRadius: 9,
    backgroundColor: Lister.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  toggleItem: {
    minWidth: 32,
    minHeight: 28,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    ...webPointer,
  },
  toggleItemActive: {
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  toggleLabel: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
    color: Lister.color.inkMuted,
  },
  toggleLabelActive: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },

  /* Design 2 Architectural Copy Composer */
  v2Root: {
    gap: 26,
  },
  v2Section: {
    gap: 12,
  },
  v2SectionDivided: {
    gap: 12,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Lister.color.border,
  },
  v2SectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  v2SectionHeadingStack: {
    flex: 1,
    minWidth: 180,
    gap: 3,
  },
  v2Muted: {
    fontFamily: Lister.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Lister.color.inkMuted,
  },
  v2AiNote: {
    fontFamily: Lister.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.inkMuted,
  },
  v2ErrorText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Lister.color.danger,
  },
  v2CountBadge: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
    color: Lister.color.primary,
  },

  /* Composer shells */
  v2ComposerShell: {
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: 12,
    backgroundColor: Lister.color.surface,
    overflow: "hidden",
  },
  v2ComposerFocused: {
    borderColor: Lister.color.ink,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 0 0 3px rgba(26, 26, 26, 0.08)" } as ViewStyle)
      : null),
  },
  v2ComposerInvalid: {
    borderWidth: 1.5,
    borderColor: Lister.color.danger,
  },
  v2TitleInput: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: Lister.type.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: Lister.color.ink,
    backgroundColor: Lister.color.surface,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  v2Toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: Lister.color.bg,
    borderBottomWidth: 1,
    borderBottomColor: Lister.color.border,
  },
  v2ToolbarLabel: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.inkMuted,
  },
  v2ToolbarActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  v2SuggestBtn: {
    minHeight: 34,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexShrink: 0,
    ...webPointer,
  },
  v2SuggestBtnHover: {
    borderColor: Lister.color.borderStrong,
    backgroundColor: Lister.color.bg,
  },
  v2SuggestBtnText: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 12.5,
    lineHeight: 16,
    color: Lister.color.ink,
  },
  v2DescriptionInput: {
    minHeight: 168,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: Lister.type.body,
    fontSize: 14.5,
    lineHeight: 22,
    color: Lister.color.ink,
    backgroundColor: Lister.color.surface,
    textAlignVertical: "top",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  v2ComposerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Lister.color.bg,
    borderTopWidth: 1,
    borderTopColor: Lister.color.surfaceMuted,
  },
  v2FooterHint: {
    flex: 1,
    minWidth: 0,
    fontFamily: Lister.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.inkMuted,
  },
  v2Counter: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
    color: Lister.color.inkMuted,
    flexShrink: 0,
  },

  /* Suggestion preview drawer */
  v2PreviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Lister.color.borderStrong,
    backgroundColor: Lister.color.surface,
    overflow: "hidden",
  },
  v2PreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Lister.color.bg,
    borderBottomWidth: 1,
    borderBottomColor: Lister.color.border,
  },
  v2PreviewHeading: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 12.5,
    lineHeight: 16,
    color: Lister.color.ink,
  },
  v2PreviewBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Lister.color.surface,
  },
  v2PreviewText: {
    fontFamily: Lister.type.body,
    fontSize: 14,
    lineHeight: 21,
    color: Lister.color.ink,
  },
  v2PreviewFooter: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Lister.color.bg,
    borderTopWidth: 1,
    borderTopColor: Lister.color.surfaceMuted,
  },
  v2PreviewPrimary: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Lister.color.ink,
    alignItems: "center",
    justifyContent: "center",
    ...webPointer,
  },
  v2PreviewPrimaryHover: {
    opacity: 0.9,
  },
  v2PreviewPrimaryText: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 12.5,
    lineHeight: 16,
    color: Lister.color.surface,
  },
  v2PreviewCancel: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    ...webPointer,
  },
  v2PreviewCancelText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12.5,
    lineHeight: 16,
    color: Lister.color.inkMuted,
  },
  v2NoticeBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },

  /* Highlights hairline checklist */
  v2Shell: {
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: 12,
    backgroundColor: Lister.color.surface,
    overflow: "hidden",
  },
  v2ColDivided: {
    borderLeftWidth: 1,
    borderLeftColor: Lister.color.border,
  },
  v2RowDivided: {
    borderTopWidth: 1,
    borderTopColor: Lister.color.surfaceMuted,
  },
  v2TagRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  v2TagCell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  v2TagSpacer: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: 14,
    borderLeftWidth: 1,
    borderLeftColor: Lister.color.border,
    backgroundColor: Lister.color.bg,
  },
  v2TagCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  v2TagTitle: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 13.5,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  v2TagTitleOn: {
    fontFamily: Lister.type.bodySemi,
  },
  v2TagSub: {
    fontFamily: Lister.type.body,
    fontSize: 11.5,
    lineHeight: 15,
    color: Lister.color.inkMuted,
  },
  v2CellHover: {
    backgroundColor: Lister.color.bg,
  },
  v2CellSelected: {
    backgroundColor: Lister.color.primaryMist,
  },
  v2Checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Lister.color.borderStrong,
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  v2CheckboxOn: {
    borderWidth: 0,
    backgroundColor: Lister.color.primary,
  },
  checkGlyph: {
    width: 9,
    height: 5,
    borderLeftWidth: 1.8,
    borderBottomWidth: 1.8,
    borderColor: Lister.color.surface,
    transform: [{ rotate: "-45deg" }, { translateY: -1 }],
  },
  pressed: {
    opacity: 0.9,
  },

  /* Design 1 styles (preserved) */
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  action: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Lister.radius.pill,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
  },
  actionPressed: {
    backgroundColor: Lister.color.primaryMist,
    borderColor: Lister.color.primary,
  },
  actionDisabled: { opacity: 0.6 },
  preview: {
    gap: 10,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.primaryMist,
  },
  area: { minHeight: 140, textAlignVertical: "top" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Lister.radius.pill,
    borderWidth: 1.5,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    cursor: "pointer",
  },
  tagOn: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
  },
  tagLabelOn: {
    color: Lister.color.primaryDeep,
    fontFamily: Lister.type.bodySemi,
  },
});
