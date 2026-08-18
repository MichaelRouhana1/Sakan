import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import type { WizardLottieAssetId, WizardStepId } from "@/lib/wizardLottieFrame";

type Ctx = {
  scrollContentRef: RefObject<View | null>;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  registerWaterMarker: (node: View | null) => void;
  measureWater: () => void;
};

const WizardArtContext = createContext<Ctx | null>(null);

type ProviderProps = {
  step: number;
  utilitiesStepIndex: number;
  viewportHeight: number;
  children: ReactNode;
};

export function WizardArtProvider({
  step,
  utilitiesStepIndex,
  viewportHeight,
  children,
}: ProviderProps) {
  const scrollContentRef = useRef<View | null>(null);
  const waterMarkerRef = useRef<View | null>(null);
  const scrollYRef = useRef(0);
  const [showWaterArt, setShowWaterArt] = useState(false);

  const measureWater = useCallback(() => {
    const content = scrollContentRef.current;
    const marker = waterMarkerRef.current;
    if (!content || !marker || step !== utilitiesStepIndex) {
      setShowWaterArt(false);
      return;
    }
    marker.measureLayout(
      content,
      (_x, y) => {
        const visible = scrollYRef.current + viewportHeight * 0.48 >= y;
        setShowWaterArt(visible);
      },
      () => setShowWaterArt(false),
    );
  }, [step, utilitiesStepIndex, viewportHeight]);

  useEffect(() => {
    if (step !== utilitiesStepIndex) {
      setShowWaterArt(false);
    } else {
      measureWater();
    }
  }, [step, utilitiesStepIndex, measureWater]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
      measureWater();
    },
    [measureWater],
  );

  const registerWaterMarker = useCallback(
    (node: View | null) => {
      waterMarkerRef.current = node;
      if (node) {
        requestAnimationFrame(measureWater);
      }
    },
    [measureWater],
  );

  const value = useMemo(
    () => ({ scrollContentRef, handleScroll, registerWaterMarker, measureWater }),
    [handleScroll, measureWater, registerWaterMarker],
  );

  return (
    <WizardArtContext.Provider value={value}>
      <WizardArtStateContext.Provider value={showWaterArt}>
        {children}
      </WizardArtStateContext.Provider>
    </WizardArtContext.Provider>
  );
}

const WizardArtStateContext = createContext(false);

function useWizardArtContext() {
  const ctx = useContext(WizardArtContext);
  if (!ctx) {
    throw new Error("WizardArtSync must be used inside WizardArtProvider");
  }
  return ctx;
}

export function useWizardLottieAsset(stepId: WizardStepId): WizardLottieAssetId {
  const showWaterArt = useContext(WizardArtStateContext);
  if (stepId === "utilities" && showWaterArt) return "water";
  return stepId;
}

export function WaterSectionMarker() {
  const ctx = useContext(WizardArtContext);
  if (!ctx) return null;
  return (
    <View
      ref={ctx.registerWaterMarker}
      collapsable={false}
      pointerEvents="none"
      onLayout={ctx.measureWater}
      style={{ height: 1, width: "100%", opacity: 0 }}
    />
  );
}

export function useWizardScrollContentRef() {
  return useWizardArtContext().scrollContentRef;
}

export function useWizardScrollHandler() {
  return useWizardArtContext().handleScroll;
}
