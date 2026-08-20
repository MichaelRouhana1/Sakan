import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { CreateFooter } from "@/components/listings/create/CreateFooter";
import { CreateProgress } from "@/components/listings/create/CreateProgress";
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
import { WizardGrain } from "@/components/listings/create/WizardGrain";
import { WizardHeadline } from "@/components/listings/create/WizardHeadline";
import { WizardLottie } from "@/components/listings/create/WizardLottie";
import { WIZARD_STEPS } from "@/constants/listingWizard";
import { Lister } from "@/constants/listerTheme";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import {
  useWizardLottieAsset,
  useWizardScrollContentRef,
  useWizardScrollHandler,
  WizardArtProvider,
} from "@/features/listings/create/WizardArtSync";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { wizardLottieFrame } from "@/lib/wizardLottieFrame";

const STEPS = [
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

const UTILITIES_STEP_INDEX = WIZARD_STEPS.findIndex((s) => s.id === "utilities");

type ShellStyles = {
  root: ViewStyle;
  chrome: ViewStyle;
  close: ViewStyle;
  saveExit?: ViewStyle;
  saveExitText?: TextStyle;
  stage: ViewStyle;
  left: ViewStyle;
  right: ViewStyle;
  rightInner: ViewStyle;
  stack: ViewStyle;
  artBand: ViewStyle;
  phoneForm: ViewStyle;
};

type Props = {
  splitAt: number;
  styles: ShellStyles;
  rootStyle?: ViewStyle;
  footerInsetBottom?: number;
};

function ShellFrame({ splitAt, styles, footerInsetBottom }: Props) {
  const { width } = useWindowDimensions();
  const split = width >= splitAt;
  const reduce = useReducedMotion();
  const { draft, goBack, goNext, saveAndExit } = useCreateListingDraft();
  const [saving, setSaving] = useState(false);
  const scrollContentRef = useWizardScrollContentRef();
  const handleScroll = useWizardScrollHandler();
  const meta = WIZARD_STEPS[draft.step];
  const Step = STEPS[draft.step];
  const last = draft.step === WIZARD_STEPS.length - 1;
  const lottieAsset = useWizardLottieAsset(meta.id);
  const lottieFrame = wizardLottieFrame(lottieAsset, width, split);

  const art = (
    <Animated.View
      key={`${meta.id}-${lottieAsset}`}
      entering={reduce ? undefined : FadeIn.duration(420)}
      exiting={reduce ? undefined : FadeOut.duration(180)}
    >
      <WizardLottie assetId={lottieAsset} {...lottieFrame} />
    </Animated.View>
  );

  const form = (
    <Animated.View
      key={`form-${meta.id}`}
      entering={
        reduce ? undefined : FadeInDown.duration(Lister.motion.enterMs)
      }
    >
      <WizardHeadline title={meta.title} subtitle={meta.subtitle} />
      <View style={{ height: split ? 32 : 20 }} />
      <Step />
    </Animated.View>
  );

  const scrollProps = {
    onScroll: handleScroll,
    scrollEventThrottle: 16 as const,
    keyboardShouldPersistTaps: "handled" as const,
  };

  const isWeb = Platform.OS === "web";

  async function handleSaveAndExit() {
    if (saving) return;
    setSaving(true);
    try {
      await saveAndExit();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <View style={styles.chrome}>
        {isWeb ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save and exit"
            onPress={() => void handleSaveAndExit()}
            disabled={saving}
            style={styles.saveExit}
          >
            <Text style={styles.saveExitText}>
              {saving ? "Saving…" : "Save & exit"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => void handleSaveAndExit()}
            disabled={saving}
            style={styles.close}
          >
            <Ionicons name="close" size={22} color={Lister.color.ink} />
          </Pressable>
        )}
        <CreateProgress step={draft.step} />
      </View>
      {split ? (
        <View style={styles.stage}>
          <View style={styles.left}>
            <WizardGrain />
            {art}
          </View>
          <ScrollView style={styles.right} {...scrollProps}>
            <View ref={scrollContentRef} collapsable={false} style={styles.rightInner}>
              {form}
            </View>
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.stack} {...scrollProps}>
          <View ref={scrollContentRef} collapsable={false}>
            <View style={styles.artBand}>
              <WizardGrain />
              {art}
            </View>
            <View style={styles.phoneForm}>{form}</View>
          </View>
        </ScrollView>
      )}
      <View style={footerInsetBottom ? { paddingBottom: footerInsetBottom } : undefined}>
        <CreateFooter
          hideBack={draft.step === 0}
          hideNext={last}
          onBack={goBack}
          onNext={() => goNext()}
          nextLabel="Next"
        />
      </View>
    </>
  );
}

export function CreateWizardShellWithArt({
  splitAt,
  styles,
  rootStyle,
  footerInsetBottom,
  viewportHeightScale = 0.72,
}: Props & { viewportHeightScale?: number }) {
  const { draft } = useCreateListingDraft();
  const [scrollViewportHeight, setScrollViewportHeight] = useState(520);

  return (
    <WizardArtProvider
      step={draft.step}
      utilitiesStepIndex={UTILITIES_STEP_INDEX}
      viewportHeight={scrollViewportHeight}
    >
      <View
        style={[styles.root, rootStyle]}
        onLayout={(e) =>
          setScrollViewportHeight(e.nativeEvent.layout.height * viewportHeightScale)
        }
      >
        <ShellFrame
          splitAt={splitAt}
          styles={styles}
          footerInsetBottom={footerInsetBottom}
        />
      </View>
    </WizardArtProvider>
  );
}
