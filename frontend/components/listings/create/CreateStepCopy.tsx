import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import {
  WizardFieldLabel,
  useWizardFieldInvalid,
  wizardInputStyle,
} from "@/components/listings/create/WizardField";
import { HIGHLIGHT_TAG_OPTIONS } from "@/constants/listingWizard";
import { Lister } from "@/constants/listerTheme";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import {
  COPY_DESCRIPTION_MIN,
  COPY_TITLE_MAX,
  COPY_TITLE_MIN,
} from "@/features/listings/create/validators";
import { useUniversities } from "@/features/universities/useUniversities";
import { listingCopyFacts } from "@/features/listings/create/listingCopyFacts";
import { useListingCopy } from "@/features/listings/create/useListingCopy";
import type { CopyMode } from "@/features/listings/create/listingCopyTemplates";

export function CreateStepCopy() {
  const { draft, patch } = useCreateListingDraft();
  const titleInvalid = useWizardFieldInvalid("title");
  const descriptionInvalid = useWizardFieldInvalid("description");
  const titleLen = draft.title.trim().length;
  const descriptionLen = draft.description.trim().length;
  const campuses = useUniversities();
  const uni = (campuses.data ?? []).find((c) => c.id === draft.primaryCampusId);
  const copy = useListingCopy(listingCopyFacts(draft, uni), draft.title, draft.description, patch);
  const aiNote = <LText variant="caption" tone="muted">AI suggestion — edit before publishing</LText>;

  function action(mode: Exclude<CopyMode, "all">, label: string) {
    return <Pressable
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: copy.disabled, busy: copy.busy === mode }}
      aria-busy={copy.busy === mode}
      disabled={copy.disabled} onPress={() => void copy.suggest(mode)}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed, copy.disabled && styles.actionDisabled]}
    >
      {copy.busy === mode ? <ActivityIndicator size="small" color={Lister.color.primary} /> : null}
      <LText variant="caption" tone="primary">{label}</LText>
    </Pressable>;
  }

  function preview(field: "title" | "description") {
    const pending = copy.pending;
    if (!pending || (pending.mode === "title" ? "title" : "description") !== field) return null;
    const label = pending.mode === "title" ? "Replace title" : pending.mode === "brief" ? "Replace first paragraph" : "Replace description";
    return <View style={styles.preview} accessibilityLiveRegion="polite">
      <LText variant="caption" tone="muted">Suggested {pending.mode === "description" ? "description" : pending.mode}</LText>
      <LText>{pending.result[pending.mode]}</LText>
      {pending.result.source === "gemini" ? aiNote : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={copy.apply} style={styles.action}>
          <LText variant="caption" tone="primary">{label}</LText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={copy.cancel} style={styles.action}>
          <LText variant="caption" tone="muted">Cancel</LText>
        </Pressable>
      </View>
    </View>;
  }

  function toggleTag(slug: string) {
    patch({
      highlightTags: draft.highlightTags.includes(slug)
        ? draft.highlightTags.filter((s) => s !== slug)
        : [...draft.highlightTags, slug],
    });
  }

  return (
    <View style={{ gap: 16 }}>
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
          style={wizardInputStyle(titleInvalid)}
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
        {copy.titleIsAi ? aiNote : null}
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
        <LText variant="caption" tone="muted">A brief becomes your first paragraph. Full descriptions add the details you selected.</LText>
        <TextInput
          accessibilityLabel="Listing description"
          placeholder="Layout, power, water, Wi-Fi, and rental terms…"
          placeholderTextColor={Lister.color.inkFaint}
          value={draft.description}
          onChangeText={(description) => patch({ description })}
          multiline
          style={[wizardInputStyle(descriptionInvalid), styles.area]}
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
        {copy.descriptionIsAi ? aiNote : null}
        {preview("description")}
        {copy.notice ? <LText variant="caption" tone="danger" accessibilityLiveRegion="polite">{copy.notice}</LText> : null}
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  action: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: Lister.radius.pill, borderWidth: 1, borderColor: Lister.color.border, backgroundColor: Lister.color.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" },
  actionPressed: { backgroundColor: Lister.color.primaryMist, borderColor: Lister.color.primary },
  actionDisabled: { opacity: 0.6 },
  preview: { gap: 10, marginTop: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Lister.color.border, backgroundColor: Lister.color.primaryMist },
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
