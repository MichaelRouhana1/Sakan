import { Pressable, StyleSheet, TextInput, View } from "react-native";
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

export function CreateStepCopy() {
  const { draft, patch } = useCreateListingDraft();
  const titleInvalid = useWizardFieldInvalid("title");
  const descriptionInvalid = useWizardFieldInvalid("description");
  const titleLen = draft.title.trim().length;
  const descriptionLen = draft.description.trim().length;
  const campuses = useUniversities();
  const uni = (campuses.data ?? []).find((c) => c.id === draft.primaryCampusId);
  const suggestion = [
    draft.propertyType === "studio" ? "Studio" : draft.bedrooms ? `${draft.bedrooms}-bed` : "Flat",
    draft.area,
    uni ? `near ${uni.institutionShortName ?? uni.name}` : null,
  ]
    .filter(Boolean)
    .join(" ");

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
        <TextInput
          accessibilityLabel="Listing title"
          placeholder="Modern 2-bed flat 3 mins from LAU"
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
        {suggestion.length > 10 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => patch({ title: suggestion.slice(0, 60) })}
          >
            <LText variant="caption" tone="primary">
              Use suggestion: {suggestion}
            </LText>
          </Pressable>
        ) : null}
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
        <TextInput
          accessibilityLabel="Listing description"
          placeholder="Neighbors, groceries, building rules, commute…"
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
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
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
