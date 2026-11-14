import { useState, type ReactNode, type RefObject } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Lister } from '@/constants/listerTheme';
import { WizardArtProvider, useWizardLottieAsset, useWizardScrollContentRef, useWizardScrollHandler } from '@/features/listings/create/WizardArtSync';
import type { Screen } from '@/features/listings/create/v2/model';
import type { WizardStepId } from '@/lib/wizardLottieFrame';
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
  const { width } = useWindowDimensions();
  const split = width >= (Platform.OS === 'web' ? 1024 : 768);
  const reduced = useReducedMotion();
  const asset = useWizardLottieAsset(ART[screen]);
  const contentRef = useWizardScrollContentRef();
  const handleScroll = useWizardScrollHandler();
  const isPlace = ['place-type', 'location', 'utilities', 'rules', 'building-photos'].includes(screen);
  const final = screen === 'review' || screen === 'success';
  const phase = isPlace ? 0 : final ? 2 : 1;
  const artWidth = split ? Math.min(350, width * (final ? 0.3 : 0.4) - 40) : Math.min(230, width - 48);
  const art = <View style={[s.scene, !split && s.sceneMobile]} testID="wizard-illustration">
    <Animated.View key={`${screen}:${unitId}:${asset}`} entering={reduced ? undefined : FadeIn.duration(420)}>
      <WizardLottie assetId={asset} width={artWidth} height={split ? 300 : 164} reducedMotion={reduced} />
    </Animated.View>
    {split ? <>
      <Text style={s.placeName}>{placeName || 'A place to belong'}</Text>
      <Text style={s.note}>{isPlace ? 'A little about the place. Just once.' : `${unitCount} ${unitCount === 1 ? 'unit' : 'units'} · one shared place`}</Text>
      <View style={s.dots}>{[0, 1, 2].map(i => <View key={i} style={[s.dot, i === phase && s.currentDot]} />)}</View>
    </> : null}
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

const s = StyleSheet.create({
  stage: { flex: 1, minHeight: 0, overflow: 'hidden' }, split: { flexDirection: 'row' },
  art: { width: '40%', backgroundColor: '#FCFBFA', borderRightWidth: 1, borderRightColor: '#F1EDEB', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  reviewArt: { width: '30%' }, artBand: { height: Platform.OS === 'web' ? 178 : 220, backgroundColor: '#FCFBFA', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scene: { alignItems: 'center', justifyContent: 'center', padding: 16, width: '100%' }, sceneMobile: { padding: 0 },
  placeName: { fontFamily: Lister.type.displaySerif, fontSize: 23, lineHeight: 30, color: '#242321', marginTop: 20, marginBottom: 8, textAlign: 'center', maxWidth: '100%' },
  note: { fontFamily: Lister.type.body, fontSize: 13, lineHeight: 21, color: '#6B6460', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 26 }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#DDD5D1' }, currentDot: { backgroundColor: '#EA3F4A' },
  scroll: { flex: 1, minWidth: 0 }, scrollContent: { flexGrow: 1, paddingBottom: 0 },
});
