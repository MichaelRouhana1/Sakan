import { useDesktopDesign, useLayoutWidth } from "@/components/ui/DesktopDesign";
import { useState, type ReactNode, type RefObject } from 'react';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Lister } from '@/constants/listerTheme';
import { WizardArtProvider, useWizardLottieAsset, useWizardScrollContentRef, useWizardScrollHandler } from '@/features/listings/create/WizardArtSync';
import type { Screen } from '@/features/listings/create/v2/model';
import { wizardLottieFrame, type WizardStepId } from '@/lib/wizardLottieFrame';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { WizardGrain } from './WizardGrain';
import { WizardLottie } from './WizardLottie';

const ART: Record<Screen, WizardStepId> = {
  'place-type': 'type', location: 'location', utilities: 'utilities', rules: 'rules',
  'building-photos': 'photos', layout: 'specs', photos: 'photos', rent: 'pricing',
  copy: 'copy', another: 'review', review: 'review', success: 'review',
};

type Props = {
  screen: Screen;
  unitId?: string;
  placeName?: string;
  unitCount?: number;
  scrollRef?: RefObject<ScrollView | null>;
  children: ReactNode;
};

/** The saved wizard's illustration/form composition, independent of draft orchestration. */
export function CreationWizardStage(props: Props) {
  const [height, setHeight] = useState(600);
  return <WizardArtProvider step={props.screen === 'utilities' ? 3 : 0} utilitiesStepIndex={3} viewportHeight={height}>
    <Stage {...props} onHeight={setHeight} />
  </WizardArtProvider>;
}

function Stage({ screen, unitId, placeName, unitCount = 1, scrollRef, children, onHeight }: Props & { onHeight: (height: number) => void }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base_s);
  
  const { width } = useWindowDimensions();
  const layoutWidth = useLayoutWidth();
  const split = layoutWidth >= (Platform.OS === 'web' ? 1024 : 768);
  const reduced = useReducedMotion();
  const asset = useWizardLottieAsset(ART[screen]);
  const contentRef = useWizardScrollContentRef();
  const handleScroll = useWizardScrollHandler();
  const final = screen === 'review' || screen === 'success';
  const frame = final && Platform.OS === 'web' && split
    ? { width: Math.min(640, width * .33), height: Math.min(640, width * .33) }
    : wizardLottieFrame(asset, width, split);
  const art = <View testID="wizard-illustration">
    <WizardLottie assetId={asset} {...frame} reducedMotion={reduced} />
  </View>;
  return <View style={[s.stage, split && s.split]} onLayout={e => onHeight(e.nativeEvent.layout.height)} testID="wizard-stage">
    {split ? <View style={[s.art, final && s.reviewArt]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><WizardGrain />{art}</View> : null}
    <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets onScroll={handleScroll} scrollEventThrottle={16}>
      <View ref={contentRef} collapsable={false}>
        {!split ? <View style={s.artBand} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><WizardGrain />{art}</View> : null}
        {children}
      </View>
    </ScrollView>
  </View>;
}

const base_s = StyleSheet.create({
  stage: { flex: 1, minHeight: 0, overflow: 'hidden' }, split: { flexDirection: 'row' },
  art: { width: Platform.OS === 'web' ? '46%' : '42%', backgroundColor: Lister.color.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  reviewArt: { width: '30%' }, artBand: { height: Platform.OS === 'web' ? 240 : 220, marginBottom: Platform.OS === 'web' ? 12 : 4, backgroundColor: Lister.color.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scroll: { flex: 1, minWidth: 0 }, scrollContent: { flexGrow: 1, paddingBottom: 0 },
});
