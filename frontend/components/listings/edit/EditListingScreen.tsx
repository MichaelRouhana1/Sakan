import { Ionicons } from "@expo/vector-icons";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { CreateStepAmenities } from "@/components/listings/create/CreateStepAmenities";
import { CreateStepContact } from "@/components/listings/create/CreateStepContact";
import { CreateStepCopy } from "@/components/listings/create/CreateStepCopy";
import { CreateStepLocation } from "@/components/listings/create/CreateStepLocation";
import { CreateStepPhotos } from "@/components/listings/create/CreateStepPhotos";
import { CreateStepPricing } from "@/components/listings/create/CreateStepPricing";
import { CreateStepReview } from "@/components/listings/create/CreateStepReview";
import { CreateStepRules } from "@/components/listings/create/CreateStepRules";
import { CreateStepSpecs } from "@/components/listings/create/CreateStepSpecs";
import { CreateStepType } from "@/components/listings/create/CreateStepType";
import { HOST_LISTINGS_PATH } from "@/constants/hostRoutes";
import { WIZARD_STEPS } from "@/constants/listingWizard";
import { Lister } from "@/constants/listerTheme";
import { openNewCreateListing } from "@/features/auth/useEnsureSession";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import type { CreateListingDraft } from "@/features/listings/create/draft";
import { wizardPublishIssues } from "@/features/listings/create/validators";
import { useEditListingMeta } from "@/features/listings/edit/EditListingProvider";
import { applyLockedBaseline } from "@/features/listings/edit/mapListingToDraft";
import { premiumClaimsChanged } from "@/features/listings/edit/premiumUtilityClaims";
import { useArchiveListing } from "@/features/listings/useArchiveListing";
import { useUpdateListing } from "@/features/listings/useUpdateListing";
import { EditPanelDismiss, EditPanelHeader } from "@/components/listings/edit/EditPanelHeader";
import { chipLabel, SectionPills } from "@/components/listings/edit/SectionPills";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { safeBack } from "@/lib/safeBack";

const SECTIONS = [
  CreateStepType,
  CreateStepLocation,
  CreateStepSpecs,
  CreateStepAmenities,
  CreateStepRules,
  CreateStepPhotos,
  CreateStepPricing,
  CreateStepCopy,
  CreateStepContact,
  CreateStepReview,
];

type Props = {
  listingId: string;
  /** Page is the native screen. Panel is the host listings drawer. */
  layout?: "page" | "panel";
  onClose?: () => void;
};

export function EditListingScreen({
  listingId,
  layout = "page",
  onClose,
}: Props) {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    PlayfairDisplay_700Bold,
  });
  const insets = useSafeAreaInsets();
  const meta = useEditListingMeta();
  const { draft, setShowValidation } = useCreateListingDraft();
  const update = useUpdateListing(listingId);
  const archive = useArchiveListing();
  const reduced = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const heights = useRef<Record<string, number>>({});
  const activeRef = useRef(WIZARD_STEPS[0].id);
  const scrollingTo = useRef<string | null>(null);
  const scrollY = useRef(0);
  const maxScroll = useRef(Number.POSITIVE_INFINITY);
  const jumpToken = useRef(0);
  const userDragging = useRef(false);
  const [active, setActive] = useState<string>(WIZARD_STEPS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [needsDisclaimer, setNeedsDisclaimer] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [claimBaseline, setClaimBaseline] = useState<CreateListingDraft | null>(
    null,
  );

  useEffect(() => {
    if (meta.baseline && !claimBaseline) setClaimBaseline(meta.baseline);
  }, [meta.baseline, claimBaseline]);

  function syncActive(id: string) {
    if (activeRef.current === id) return;
    activeRef.current = id;
    setActive(id);
  }

  function destinationFor(id: string) {
    const raw = Math.max(0, (offsets.current[id] ?? 0) - 8);
    return Math.min(raw, maxScroll.current);
  }

  function jumpTo(id: string) {
    const y = destinationFor(id);
    const token = ++jumpToken.current;
    syncActive(id);
    if (Math.abs(scrollY.current - y) <= 2) {
      scrollingTo.current = null;
      return;
    }
    // Hold the clicked pill until the scroll actually arrives. Releasing early
    // lets the spy select the section just above the target, then correct itself.
    scrollingTo.current = id;
    scrollRef.current?.scrollTo({ y, animated: !reduced });
    setTimeout(() => {
      if (jumpToken.current === token && scrollingTo.current === id) {
        scrollingTo.current = null;
      }
    }, 1400);
  }

  function sectionAt(y: number, native: NativeScrollEvent): string {
    const { contentSize, layoutMeasurement } = native;
    const maxScroll = Math.max(0, contentSize.height - layoutMeasurement.height);
    const atEnd = maxScroll > 0 && y >= maxScroll - 4;
    const marker = atEnd ? y + layoutMeasurement.height * 0.4 : y + 12;
    let next = WIZARD_STEPS[0].id;
    for (const step of WIZARD_STEPS) {
      const top = offsets.current[step.id];
      if (top != null && top <= marker) next = step.id;
    }
    if (!atEnd) return next;
    const look = y + Math.min(72, layoutMeasurement.height * 0.35);
    let visible = next;
    for (const step of WIZARD_STEPS) {
      const top = offsets.current[step.id];
      const height = heights.current[step.id] ?? 0;
      if (top == null) continue;
      if (top <= look && top + height > look) visible = step.id;
    }
    return visible;
  }

  function onFormScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = event.nativeEvent.contentOffset.y;
    const { contentSize, layoutMeasurement } = event.nativeEvent;
    scrollY.current = y;
    if (layoutMeasurement.height > 0) {
      maxScroll.current = Math.max(0, contentSize.height - layoutMeasurement.height);
    }
    const pending = scrollingTo.current;
    if (pending) {
      if (Math.abs(y - destinationFor(pending)) > 2) return;
      scrollingTo.current = null;
      return;
    }
    syncActive(sectionAt(y, event.nativeEvent));
  }

  function leave() {
    if (onClose) {
      onClose();
      return;
    }
    if (Platform.OS === "web") {
      router.replace(HOST_LISTINGS_PATH as never);
      return;
    }
    safeBack("/(poster)/(tabs)" as never);
  }

  async function save(acknowledged = false) {
    setSaved(false);
    const issues = wizardPublishIssues(draft);
    if (issues.length > 0) {
      setShowValidation(true);
      setNeedsDisclaimer(false);
      setError(issues[0]?.messages[0] ?? "Check the highlighted fields.");
      jumpTo(WIZARD_STEPS[issues[0].step].id);
      return;
    }
    const payload =
      meta.structuralLocked && meta.baseline
        ? applyLockedBaseline(draft, meta.baseline)
        : draft;
    if (
      claimBaseline &&
      premiumClaimsChanged(claimBaseline, payload) &&
      !acknowledged
    ) {
      setNeedsDisclaimer(true);
      setError(null);
      return;
    }
    setNeedsDisclaimer(false);
    setError(null);
    try {
      await update.mutateAsync(payload);
      setClaimBaseline(payload);
      setSaved(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const code = err.response?.data?.error?.code;
        const message = err.response?.data?.error?.message;
        if (code === "STRUCTURAL_FIELDS_LOCKED") {
          setError(
            message ??
              "Structural fields are locked. Need a different unit? Archive this listing and post again.",
          );
          return;
        }
        setError(message ?? "Could not save. Check the form and try again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  async function archiveAndRepost() {
    try {
      await archive.mutateAsync(listingId);
      openNewCreateListing(router);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive.");
    }
  }

  const panel = layout === "panel";

  if (!fontsLoaded || meta.loading) {
    return (
      <View style={[styles.screen, panel && styles.screenPanel]}>
        {panel ? <EditPanelDismiss onClose={leave} /> : null}
        <View style={styles.center}>
          <ActivityIndicator color={Lister.color.primary} />
        </View>
      </View>
    );
  }

  if (meta.missing || meta.forbidden) {
    return (
      <View style={[styles.screen, panel && styles.screenPanel]}>
        {panel ? <EditPanelDismiss onClose={leave} /> : null}
        <View style={[styles.center, panel && styles.panelMessage]}>
          <LText variant="title">Listing not found</LText>
          <LButton label="Back to listings" variant="secondary" onPress={leave} style={styles.gap} />
        </View>
      </View>
    );
  }

  if (meta.notLive) {
    return (
      <View style={[styles.screen, panel && styles.screenPanel]}>
        {panel ? <EditPanelDismiss onClose={leave} /> : null}
        <View style={[styles.center, panel && styles.panelMessage]}>
          <LText variant="title">Only live listings can be edited here</LText>
          <LText variant="body" tone="muted" style={styles.centerCopy}>
            Finish a draft in the create flow, or archive a rented unit and post it again.
          </LText>
          <LButton label="Back to listings" variant="secondary" onPress={leave} />
        </View>
      </View>
    );
  }
  const statusLine = error
    ? error
    : needsDisclaimer
      ? "Inaccurate utility claims can get this listing removed without a refund."
      : saved
        ? "Saved. No post credit used."
        : "Doesn't use a post credit.";

  return (
    <View
      style={[
        styles.screen,
        panel && styles.screenPanel,
        { paddingTop: panel ? 0 : Platform.OS === "web" ? 12 : insets.top },
      ]}
    >
      {panel ? (
        <EditPanelHeader
          structuralOpen={!meta.structuralLocked}
          tone={
            error ? "error" : needsDisclaimer ? "disclaimer" : saved ? "saved" : "idle"
          }
          message={statusLine}
          pending={update.isPending}
          onClose={leave}
          onSave={() => void save(needsDisclaimer)}
        />
      ) : (
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to listings"
            onPress={leave}
            style={({ pressed, hovered }) => [
              styles.back,
              hovered && styles.backHover,
              pressed && styles.backPressed,
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={Lister.color.ink} />
          </Pressable>
          <View style={styles.topCopy}>
            <LText variant="caption" tone="muted">
              Edit listing
            </LText>
            <LText variant="subtitle" numberOfLines={1} style={styles.serifTitle}>
              {meta.title}
            </LText>
            <LText
              variant="caption"
              tone={error ? "danger" : "muted"}
              numberOfLines={error ? 2 : 1}
            >
              {statusLine}
            </LText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={needsDisclaimer ? "Confirm and save listing" : "Save changes"}
            disabled={update.isPending}
            onPress={() => void save(needsDisclaimer)}
            style={({ pressed, hovered }) => [
              styles.saveBtn,
              hovered && !update.isPending && styles.saveBtnHover,
              pressed && styles.saveBtnPressed,
              update.isPending && styles.saveBtnBusy,
            ]}
          >
            {update.isPending ? (
              <ActivityIndicator color={Lister.color.surface} size="small" />
            ) : (
              <LText variant="caption" style={styles.saveLabel}>
                {needsDisclaimer ? "Confirm" : "Save"}
              </LText>
            )}
          </Pressable>
        </View>
      )}

      {meta.structuralLocked ? (
        <View style={[styles.lockBanner, panel && styles.bannerInset]}>
          <Ionicons name="lock-closed" size={18} color={Lister.color.warning} />
          <View style={styles.lockCopy}>
            <LText variant="subtitle">The unit itself is locked</LText>
            <LText variant="caption" tone="muted">
              Rent, photos, utilities, and house rules can still change. The address, size, and who the place is for stay as first published.
            </LText>
            {confirmArchive ? (
              <View style={styles.archiveRow}>
                <LText variant="caption">
                  Archive takes this listing off search. The next unit spends a post credit.
                </LText>
                <LButton
                  label="Archive and post again"
                  variant="secondary"
                  loading={archive.isPending}
                  onPress={() => void archiveAndRepost()}
                />
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmArchive(true)}
                style={styles.linkBtn}
              >
                <LText variant="caption" tone="primary" style={styles.link}>
                  Need a different unit? Archive this listing and post again.
                </LText>
              </Pressable>
            )}
          </View>
        </View>
      ) : panel ? null : (
        <View style={styles.openBanner}>
          <Ionicons name="time-outline" size={18} color={Lister.color.primary} />
          <LText variant="caption" style={styles.openCopy}>
            First day after publish: you can still correct the floor, beds, or pin. After that, those fields lock to this unit.
          </LText>
        </View>
      )}

      <SectionPills activeId={active} onSelect={jumpTo} />

      <ScrollView
        ref={scrollRef}
        style={styles.formScroll}
        contentContainerStyle={panel ? styles.scrollPanel : styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onTouchStart={() => {
          userDragging.current = true;
        }}
        onTouchEnd={() => {
          userDragging.current = false;
        }}
        onTouchCancel={() => {
          userDragging.current = false;
        }}
        onScrollBeginDrag={() => {
          // Web fires this when a programmatic smooth scroll stops, which was
          // dropping the lock a moment early and selecting the section above.
          if (!userDragging.current) return;
          scrollingTo.current = null;
        }}
        onScroll={onFormScroll}
      >
        {WIZARD_STEPS.map((step, index) => {
          const Step = SECTIONS[index];
          return (
            <View
              key={step.id}
              nativeID={`edit-${step.id}`}
              onLayout={(event) => {
                offsets.current[step.id] = event.nativeEvent.layout.y;
                heights.current[step.id] = event.nativeEvent.layout.height;
              }}
              style={[styles.section, panel && styles.sectionPanel]}
            >
              <LText variant="title" style={[styles.sectionTitle, panel && styles.sectionTitlePanel]}>
                {chipLabel(step.id)}
              </LText>
              <LText variant="caption" tone="muted" style={styles.sectionSub}>
                {step.subtitle}
              </LText>
              <Step />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
    backgroundColor: Lister.color.bg,
  },
  screenPanel: {
    height: "100%",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: Lister.color.bg,
    gap: 12,
  },
  centerCopy: {
    textAlign: "center",
    maxWidth: 420,
  },
  panelMessage: {
    justifyContent: "flex-start",
    paddingTop: 28,
    alignItems: "flex-start",
    paddingHorizontal: 20,
  },
  gap: { marginTop: 8 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.bg,
    cursor: "pointer",
  },
  backHover: {
    backgroundColor: Lister.color.primaryMist,
  },
  backPressed: {
    opacity: 0.7,
  },
  topCopy: { flex: 1, minWidth: 0 },
  serifTitle: {
    fontFamily: Lister.type.displaySerif,
  },
  lockBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: Lister.radius.lg,
    backgroundColor: Lister.color.warningSoft,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  lockCopy: { flex: 1, gap: 6 },
  openBanner: {
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.primaryMist,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  openCopy: { flex: 1 },
  bannerInset: {
    marginTop: 10,
  },
  archiveRow: { gap: 8, marginTop: 4 },
  linkBtn: { alignSelf: "flex-start", cursor: "pointer" },
  link: { textDecorationLine: "underline" },
  formScroll: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
    maxWidth: 860,
    width: "100%",
    alignSelf: "center",
  },
  scrollPanel: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
    width: "100%",
  },
  section: {
    backgroundColor: Lister.color.surface,
    borderRadius: Lister.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Lister.color.border,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: Lister.type.displaySerif,
    fontSize: 22,
    lineHeight: 28,
  },
  sectionTitlePanel: {
    fontSize: 20,
    lineHeight: 26,
  },
  sectionPanel: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionSub: { marginBottom: 2 },
  saveBtn: {
    height: 34,
    minWidth: 72,
    marginTop: 2,
    paddingHorizontal: 16,
    borderRadius: Lister.radius.pill,
    backgroundColor: Lister.color.primary,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  saveBtnHover: {
    backgroundColor: Lister.color.primaryDeep,
  },
  saveBtnPressed: {
    opacity: 0.88,
  },
  saveBtnBusy: {
    opacity: 0.6,
  },
  saveLabel: {
    color: Lister.color.surface,
    fontFamily: Lister.type.bodySemi,
  },
});
