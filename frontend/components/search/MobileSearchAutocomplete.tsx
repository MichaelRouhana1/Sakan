import { searchDebug } from '@/features/search/searchDebug';
import React, {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Studently } from '@/constants/theme';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useSearchSuggestions } from '@/features/search/useSearchSuggestions';
import { recentKey } from '@/features/search/recentSearches';
import type { SearchSuggestion } from '@/features/search/types';
import type { SearchAutocompleteProps } from './SearchAutocomplete';
import { SearchDestinationContent } from './SearchDestinationContent';
import { SearchSheetInput } from './SearchSheetInput';
import type { SearchSheetInputHandle } from './SearchSheetInput.types';
import {
  isNearby,
  nearbyCountLabel,
  OSM_ATTRIBUTION,
  SEARCH_TYPE_LABEL,
} from './searchDisplay';

/**
 * Critically-damped UI-thread springs (zeta = 1.0) driving a single phase-locked
 * `morphProgress` (0 = resting search bar, 1 = full-screen search page):
 * - Eliminates the long bezier tail crawl across the status bar & bottom tab bar
 * - Keeps header, sections, pill ghost, and iOS BlurView intensity 100% phase-locked
 *   on open, close, and mid-flight interruption (never leaves an empty white box)
 * - Animates BlurView `intensity` via `useAnimatedProps` with ancestor opacity = 1
 *   so iOS `UIVisualEffectView` blurs smoothly every frame
 */
const PRESS_EASE = Easing.bezier(0.2, 0, 0, 1);
// Middle ground between v2 (~240ms, too fast) and v3 (~485ms, too slow):
// open reaches 95% in ~355ms, close in ~300ms.
const OPEN_SPRING = {
  mass: 1,
  stiffness: 180,
  damping: 27,
  overshootClamping: true,
  restDisplacementThreshold: 0.0005,
  restSpeedThreshold: 0.004,
};
const CLOSE_SPRING = {
  mass: 1,
  stiffness: 250,
  damping: 32,
  overshootClamping: true,
  restDisplacementThreshold: 0.0005,
  restSpeedThreshold: 0.004,
};
const BACK_ICON_SPRING = { damping: 18, stiffness: 180, mass: 0.85 };
const REDUCED_OPEN_MS = 220;
const REDUCED_CLOSE_MS = 185;
const IOS_SCREEN_CORNER_RADIUS = 44;
const ANDROID_FLIGHT_CORNER_RADIUS = 28;

const icons = {
  city: 'location-outline',
  area: 'location-outline',
  campus: 'school-outline',
  place: 'business-outline',
  street: 'trail-sign-outline',
  hood: 'location-outline',
} as const;

const words = ['City', 'University', 'Property'];

type BarRect = { x: number; y: number; width: number; height: number };

function useWord(enabled: boolean, reduced: boolean) {
  const [frame, setFrame] = useState({ word: 0, count: 0, deleting: false });
  useEffect(() => {
    if (!enabled || reduced) return;
    const text = words[frame.word];
    const delay = frame.deleting
      ? frame.count
        ? 28
        : 400
      : frame.count === text.length
        ? 2000
        : 55;
    const timer = setTimeout(
      () =>
        setFrame((x) =>
          x.deleting
            ? x.count
              ? { ...x, count: x.count - 1 }
              : { word: (x.word + 1) % words.length, count: 0, deleting: false }
            : x.count === words[x.word].length
              ? { ...x, deleting: true }
              : { ...x, count: x.count + 1 },
        ),
      delay,
    );
    return () => clearTimeout(timer);
  }, [enabled, reduced, frame]);
  return reduced
    ? 'city, area or university'
    : words[frame.word].slice(0, frame.count);
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export function MobileSearchAutocomplete({
  value: launchValue,
  onSelect,
  onSubmitText,
  variant = 'bar',
  containerStyle,
  barStyle,
  autoFocus,
  recentSuggestions = [],
  onClearRecents,
  recentsError,
  recentPersistenceError,
  onRetryRecents,
  onOpenSearch,
  suggestionsEnabled = true,
}: SearchAutocompleteProps) {
  const [value, setValue] = useState('');
  const dimensions = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [composing, setComposing] = useState(false);
  const [active, setActive] = useState(-1);

  const input = useRef<SearchSheetInputHandle>(null);
  const trigger = useRef<View>(null);
  const modalRootRef = useRef<View>(null);
  const scroll = useRef<ScrollView>(null);
  const closing = useRef(false);
  const afterCloseRef = useRef<(() => void) | undefined>(undefined);
  const closeSafetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLayoutRef = useRef({
    width: Math.max(200, dimensions.width - 32),
    height: variant === 'pill' ? 62 : 44,
  });

  const grids = useRef<Record<string, ScrollView | null>>({});
  const gridTargets = useRef<Record<number, { group: string; x: number }>>({});
  const rowRefs = useRef<Record<number, View | null>>({});
  const scrollY = useRef(0);

  const reduced = useReducedMotion();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const listId = `mobile-search-${id}`;

  const query = useSearchSuggestions(
    value,
    visible && !composing && suggestionsEnabled,
  );
  const typed =
    [
      ...value
        .trim()
        .normalize('NFKC')
        .replace(/[\p{M}\u0640\u200b-\u200f\ufeff]/gu, ''),
    ].length >= 2;
  const arabic = /[\u0600-\u06ff]/.test(value);
  const areas = query.data?.sections.topAreas ?? [];
  const campuses = query.data?.sections.topCampuses ?? [];
  const freshDefaults = [...areas, ...campuses];
  const recents = recentSuggestions
    .slice(0, 8)
    .map(
      (item) =>
        freshDefaults.find((fresh) => recentKey(fresh) === recentKey(item)) ??
        item,
    );
  const items = useMemo(
    () =>
      typed ? query.data?.results ?? [] : [...recents, ...areas, ...campuses],
    [typed, query.data, recentSuggestions],
  );
  const word = useWord(!visible && !launchValue, reduced);

  // Resolved launcher appearance so the morphing ghost matches every screen's bar 1:1
  const flatLauncherStyle: ViewStyle = useMemo(
    () =>
      StyleSheet.flatten([
        styles.launcher,
        variant === 'pill' ? styles.hero : styles.compact,
        containerStyle as ViewStyle | undefined,
        barStyle,
      ]) || {},
    [variant, containerStyle, barStyle],
  );
  const restingBorderWidth =
    typeof flatLauncherStyle.borderWidth === 'number'
      ? flatLauncherStyle.borderWidth
      : variant === 'pill'
        ? 2
        : 1;
  const restingBorderColor =
    typeof flatLauncherStyle.borderColor === 'string'
      ? flatLauncherStyle.borderColor
      : variant === 'pill'
        ? '#ea3f4a'
        : '#e5e7eb';

  // UI-thread Reanimated shared values
  const pressScale = useSharedValue(1);
  const launcherHiddenSV = useSharedValue(0);
  const anchorX = useSharedValue(16);
  const anchorY = useSharedValue(insets.top + 12);
  const anchorW = useSharedValue(Math.max(200, dimensions.width - 32));
  const anchorH = useSharedValue(variant === 'pill' ? 62 : 44);
  const modalOriginX = useSharedValue(0);
  const modalOriginY = useSharedValue(0);
  const targetW = useSharedValue(dimensions.width);
  const targetH = useSharedValue(dimensions.height);
  const topInsetSV = useSharedValue(insets.top);
  const isReducedSV = useSharedValue(reduced ? 1 : 0);

  // Single phase-locked morph driver (0 = bar, 1 = open search page)
  const morphProgress = useSharedValue(0);
  const reducedOpacity = useSharedValue(0);
  const closeIconScale = useSharedValue(1);

  useEffect(() => {
    targetW.value = dimensions.width;
    targetH.value = dimensions.height;
    topInsetSV.value = insets.top;
    isReducedSV.value = reduced ? 1 : 0;
  }, [dimensions.width, dimensions.height, insets.top, reduced]);

  useEffect(() => {
    return () => {
      if (closeSafetyTimer.current) clearTimeout(closeSafetyTimer.current);
    };
  }, []);

  const fallbackBarRect = useCallback((): BarRect => {
    const w =
      lastLayoutRef.current.width > 0
        ? lastLayoutRef.current.width
        : Math.max(200, dimensions.width - 32);
    const h =
      lastLayoutRef.current.height > 0
        ? lastLayoutRef.current.height
        : variant === 'pill'
          ? 62
          : 44;
    return {
      x: Math.round((dimensions.width - w) / 2),
      y: insets.top + 12,
      width: w,
      height: h,
    };
  }, [dimensions.width, insets.top, variant]);

  const measureBarNow = useCallback(
    (cb: (rect: BarRect) => void) => {
      const node = trigger.current;
      if (!node || typeof node.measureInWindow !== 'function') {
        cb(fallbackBarRect());
        return;
      }
      let settled = false;
      const fallbackTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          cb(fallbackBarRect());
        }
      }, 48);
      node.measureInWindow((x, y, width, height) => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        if (
          Number.isFinite(width) &&
          Number.isFinite(height) &&
          width > 0 &&
          height > 0
        ) {
          cb({ x, y, width, height });
        } else {
          cb(fallbackBarRect());
        }
      });
    },
    [fallbackBarRect],
  );

  const syncAnchor = useCallback(
    (rect: BarRect) => {
      anchorX.value = rect.x;
      anchorY.value = rect.y;
      anchorW.value = rect.width;
      anchorH.value = rect.height;
    },
    [anchorX, anchorY, anchorW, anchorH],
  );

  const open = useCallback(() => {
    if (closing.current || visible) return;
    pressScale.value = withTiming(1, { duration: 140, easing: PRESS_EASE });
    measureBarNow((rect) => {
      syncAnchor(rect);
      if (reduced) {
        morphProgress.value = 1;
        reducedOpacity.value = 0;
        closeIconScale.value = 1;
        launcherHiddenSV.value = 0;
      } else {
        morphProgress.value = 0;
        reducedOpacity.value = 1;
        closeIconScale.value = 0.6;
        // Keep real launcher visible until Modal native window actually mounts (prevents 1-frame tap blink)
        launcherHiddenSV.value = 0;
      }
      closing.current = false;
      setValue('');
      setComposing(false);
      setActive(-1);
      setVisible(true);
      onOpenSearch?.();
    });
  }, [
    visible,
    reduced,
    measureBarNow,
    syncAnchor,
    onOpenSearch,
    pressScale,
    morphProgress,
    reducedOpacity,
    closeIconScale,
    launcherHiddenSV,
  ]);

  useLayoutEffect(() => {
    if (!visible) return;
    if (reduced) {
      reducedOpacity.value = withTiming(1, {
        duration: REDUCED_OPEN_MS,
        easing: Easing.out(Easing.quad),
      });
      return;
    }
    morphProgress.value = withSpring(1, OPEN_SPRING);
    closeIconScale.value = withSpring(1, BACK_ICON_SPRING);
  }, [visible, reduced]);

  const unmountModalAfterRestore = useCallback(() => {
    if (!closing.current) return;
    if (closeSafetyTimer.current) {
      clearTimeout(closeSafetyTimer.current);
      closeSafetyTimer.current = null;
    }
    // Restore real launcher opacity BEFORE unmounting Modal so there is zero frame gap
    launcherHiddenSV.value = 0;
    requestAnimationFrame(() => {
      closing.current = false;
      setVisible(false);
      setFocused(false);
      setComposing(false);
      setActive(-1);
      const cb = afterCloseRef.current;
      afterCloseRef.current = undefined;
      if (cb) cb();
    });
  }, [launcherHiddenSV]);

  const close = useCallback(
    (after?: () => void) => {
      if (closing.current) return;
      closing.current = true;
      afterCloseRef.current = after;
      Keyboard.dismiss();
      input.current?.blur();

      const safetyMs = reduced ? REDUCED_CLOSE_MS + 140 : 950;
      if (closeSafetyTimer.current) clearTimeout(closeSafetyTimer.current);
      closeSafetyTimer.current = setTimeout(unmountModalAfterRestore, safetyMs);

      // Re-measure live bar position right now in case underlying page scrolled while open
      measureBarNow((liveRect) => {
        syncAnchor(liveRect);
        if (reduced) {
          reducedOpacity.value = withTiming(
            0,
            { duration: REDUCED_CLOSE_MS, easing: Easing.out(Easing.quad) },
            (finished) => {
              if (finished) runOnJS(unmountModalAfterRestore)();
            },
          );
          return;
        }
        closeIconScale.value = withTiming(0.65, {
          duration: 220,
          easing: PRESS_EASE,
        });
        morphProgress.value = withSpring(0, CLOSE_SPRING, (finished) => {
          if (finished) runOnJS(unmountModalAfterRestore)();
        });
      });
    },
    [
      reduced,
      measureBarNow,
      syncAnchor,
      unmountModalAfterRestore,
      reducedOpacity,
      closeIconScale,
      morphProgress,
    ],
  );

  const select = (item: SearchSuggestion) => {
    searchDebug('select.begin', { id: item.id, closing: closing.current });
    if (!closing.current) {
      close(() => {
        searchDebug('select.afterClose', { id: item.id });
        onSelect(item);
      });
    }
  };

  const submit = () => {
    if (composing || closing.current) return;
    if (items.length && (active >= 0 || typed)) {
      select(items[Math.max(0, active)]);
    } else {
      close(() => onSubmitText(value.trim()));
    }
  };

  useEffect(() => {
    if (autoFocus) open();
  }, []);

  useEffect(() => {
    setActive(-1);
    scrollY.current = 0;
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [value, query.data, recentSuggestions]);

  useEffect(() => {
    if (active < 0) return;
    const target = gridTargets.current[active];
    if (target) {
      grids.current[target.group]?.scrollTo({ x: target.x, animated: !reduced });
    }
    rowRefs.current[active]?.measureInWindow((_x, y, _w, h) =>
      scroll.current
        ?.getNativeScrollRef()
        ?.measureInWindow((_sx, sy, _sw, sh) => {
          const delta =
            y < sy ? y - sy - 12 : y + h > sy + sh ? y + h - sy - sh + 12 : 0;
          if (delta) {
            scroll.current?.scrollTo({
              y: Math.max(0, scrollY.current + delta),
              animated: !reduced,
            });
          }
        }),
    );
  }, [active, reduced, listId]);

  function keyboard(event: any) {
    const key = event.nativeEvent.key;
    if (composing || event.nativeEvent.isComposing) return;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'].includes(key)) {
      event.preventDefault?.();
    }
    if (key === 'ArrowDown' && items.length) {
      setActive((x) => Math.min(items.length - 1, x + 1));
    }
    if (key === 'ArrowUp' && items.length) {
      setActive((x) => Math.max(0, x - 1));
    }
    if (key === 'Home' && active >= 0) setActive(0);
    if (key === 'End' && active >= 0) setActive(items.length - 1);
    if (key === 'Escape') {
      setActive(-1);
      input.current?.blur();
    }
  }

  const onTriggerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      lastLayoutRef.current = { width, height };
    }
  }, []);

  const onModalPresented = useCallback(() => {
    if (!reduced && !closing.current) {
      launcherHiddenSV.value = 1;
    }
    modalRootRef.current?.measureInWindow((mx, my) => {
      if (Number.isFinite(mx) && Number.isFinite(my)) {
        modalOriginX.value = mx;
        modalOriginY.value = my;
      }
    });
  }, [reduced, launcherHiddenSV, modalOriginX, modalOriginY]);

  // --- UI-thread Animated Props & Styles ---
  const launcherAnimStyle = useAnimatedStyle(() => ({
    opacity: isReducedSV.value > 0.5 ? 1 : 1 - launcherHiddenSV.value,
    transform: [{ scale: pressScale.value }],
  }));

  const blurAnimatedProps = useAnimatedProps(() => {
    const p =
      isReducedSV.value > 0.5 ? reducedOpacity.value : morphProgress.value;
    return {
      intensity: interpolate(p, [0, 0.85], [0, 78], Extrapolation.CLAMP),
    };
  });

  const washAnimStyle = useAnimatedStyle(() => {
    const p =
      isReducedSV.value > 0.5 ? reducedOpacity.value : morphProgress.value;
    return {
      opacity: interpolate(p, [0, 0.85], [0, 1], Extrapolation.CLAMP),
    };
  });

  const morphCardStyle = useAnimatedStyle(() => {
    if (isReducedSV.value > 0.5) {
      return {
        left: 0,
        top: 0,
        width: targetW.value,
        height: targetH.value,
        borderRadius: 0,
        borderWidth: 0,
        opacity: reducedOpacity.value,
        shadowOpacity: 0,
        elevation: 0,
      };
    }
    const p = morphProgress.value;
    const x0 = anchorX.value - modalOriginX.value;
    const y0 = anchorY.value - modalOriginY.value;
    const w0 = anchorW.value;
    const h0 = anchorH.value;
    const r0 = h0 / 2;
    const targetCornerRadius =
      Platform.OS === 'ios'
        ? IOS_SCREEN_CORNER_RADIUS
        : interpolate(
            p,
            [0.88, 1],
            [ANDROID_FLIGHT_CORNER_RADIUS, 0],
            Extrapolation.CLAMP,
          );
    return {
      left: interpolate(p, [0, 1], [x0, 0], Extrapolation.CLAMP),
      top: interpolate(p, [0, 1], [y0, 0], Extrapolation.CLAMP),
      width: interpolate(p, [0, 1], [w0, targetW.value], Extrapolation.CLAMP),
      height: interpolate(p, [0, 1], [h0, targetH.value], Extrapolation.CLAMP),
      borderRadius: interpolate(
        p,
        [0, 1],
        [r0, targetCornerRadius],
        Extrapolation.CLAMP,
      ),
      borderWidth: interpolate(
        p,
        [0, 0.25],
        [restingBorderWidth, 0],
        Extrapolation.CLAMP,
      ),
      opacity: 1,
      shadowOpacity: interpolate(
        p,
        [0, 0.12, 0.88, 1],
        [0.14, 0.22, 0.16, 0],
        Extrapolation.CLAMP,
      ),
      elevation: interpolate(
        p,
        [0, 0.12, 0.88, 1],
        [6, 16, 10, 0],
        Extrapolation.CLAMP,
      ),
    };
  });

  const launcherGhostStyle = useAnimatedStyle(() => {
    const p = morphProgress.value;
    const currentH = interpolate(
      p,
      [0, 1],
      [anchorH.value, targetH.value],
      Extrapolation.CLAMP,
    );
    return {
      width: anchorW.value,
      height: anchorH.value,
      opacity:
        isReducedSV.value > 0.5
          ? 0
          : interpolate(p, [0, 0.22], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: (currentH - anchorH.value) / 2 },
        {
          scale: interpolate(p, [0, 0.24], [1, 0.96], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const innerPageFrameStyle = useAnimatedStyle(() => {
    if (isReducedSV.value > 0.5) {
      return { transform: [{ translateX: 0 }, { translateY: 0 }] };
    }
    const p = morphProgress.value;
    const currentW = interpolate(
      p,
      [0, 1],
      [anchorW.value, targetW.value],
      Extrapolation.CLAMP,
    );
    // Align header centerline (insets.top + 34) with the launcher bar centerline (h0 / 2) at p = 0,
    // and center horizontally inside morphShell so right-side input padding is never clipped.
    const startShiftY = -(topInsetSV.value + (68 - anchorH.value) / 2);
    return {
      transform: [
        { translateX: (currentW - targetW.value) / 2 },
        {
          translateY: interpolate(
            p,
            [0, 1],
            [startShiftY, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const headerAnimStyle = useAnimatedStyle(() => {
    if (isReducedSV.value > 0.5) {
      return { opacity: 1, transform: [{ scale: 1 }] };
    }
    const p = morphProgress.value;
    return {
      // Soft cross-handoff as launcherGhost fades out -> zero text collision
      opacity: interpolate(p, [0.18, 0.56], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(p, [0.18, 1], [0.96, 1], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const backIconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isReducedSV.value > 0.5 ? 1 : closeIconScale.value }],
  }));

  const sec0AnimStyle = useAnimatedStyle(() => {
    if (isReducedSV.value > 0.5) {
      return { opacity: 1, transform: [{ translateY: 0 }] };
    }
    const p = morphProgress.value;
    return {
      opacity: interpolate(p, [0.22, 0.68], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            p,
            [0.22, 0.85],
            [14, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const sec1AnimStyle = useAnimatedStyle(() => {
    if (isReducedSV.value > 0.5) {
      return { opacity: 1, transform: [{ translateY: 0 }] };
    }
    const p = morphProgress.value;
    return {
      opacity: interpolate(p, [0.32, 0.78], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            p,
            [0.32, 0.92],
            [18, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const sec2AnimStyle = useAnimatedStyle(() => {
    if (isReducedSV.value > 0.5) {
      return { opacity: 1, transform: [{ translateY: 0 }] };
    }
    const p = morphProgress.value;
    return {
      opacity: interpolate(p, [0.42, 0.88], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            p,
            [0.42, 1],
            [22, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const sectionAnimStyles = [sec0AnimStyle, sec1AnimStyle, sec2AnimStyle];

  const option = (
    item: SearchSuggestion,
    mode: 'typed' | 'recent' | 'area' | 'campus',
    index: number,
  ) => {
    const selected = index === active;
    return (
      <Pressable
        key={recentKey(item)}
        nativeID={`${listId}-${index}`}
        accessibilityRole="button"
        accessibilityLabel={`${item.label.en}, ${item.context.en}, ${SEARCH_TYPE_LABEL[item.type]}`}
        accessibilityState={{ selected }}
        ref={(node) => {
          rowRefs.current[index] = node;
        }}
        onPress={() => {
          searchDebug('option.onPress', {
            type: item.type,
            id: item.id,
            url: item.url,
          });
          select(item);
        }}
        style={({ pressed }) => [
          mode === 'typed'
            ? styles.row
            : mode === 'recent'
              ? styles.recentRow
              : styles.gridRow,
          (pressed || selected) && styles.selected,
        ]}
      >
        {mode !== 'typed' ? (
          <SearchDestinationContent item={item} recent={mode === 'recent'} />
        ) : (
          <>
            <View style={styles.iconTile}>
              <Ionicons
                name={icons[item.type]}
                size={22}
                color={selected ? '#ea3f4a' : '#667085'}
              />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, arabic && styles.rtl]}>
                {arabic ? item.label.ar : item.label.en}
              </Text>
              <Text style={[styles.translation, !arabic && styles.rtl]}>
                {arabic ? item.label.en : item.label.ar}
              </Text>
              <Text style={styles.context}>
                {item.context.en} · {item.context.ar}
                {isNearby(item) ? ` · ${nearbyCountLabel(item)}` : ''}
              </Text>
            </View>
            <Text style={styles.badge}>{SEARCH_TYPE_LABEL[item.type]}</Text>
          </>
        )}
      </Pressable>
    );
  };

  function section(
    title: string,
    entries: SearchSuggestion[],
    mode: 'recent' | 'area' | 'campus',
    start: number,
    slotIndex: number,
  ) {
    if (!entries.length) return null;
    const half = Math.ceil(entries.length / 2);
    const columnWidth = Math.round((dimensions.width - 32) * 0.48);
    const animStyle = sectionAnimStyles[Math.min(slotIndex, 2)];
    return (
      <Animated.View
        style={[styles.section, animStyle]}
        accessibilityLabel={title}
      >
        <View style={styles.sectionHead}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {title}
          </Text>
          {mode === 'recent' && onClearRecents && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear recent searches"
              onPress={onClearRecents}
              hitSlop={6}
              style={styles.clearRecents}
            >
              <Text style={styles.link}>Clear all</Text>
            </Pressable>
          )}
        </View>
        {mode === 'recent' ? (
          <View style={styles.recentList}>
            {entries.map((item, index) => option(item, mode, start + index))}
          </View>
        ) : (
          <ScrollView
            ref={(node) => {
              grids.current[mode] = node;
            }}
            horizontal
            style={styles.horizontalGrid}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            directionalLockEnabled
            contentContainerStyle={styles.gridContent}
          >
            {Array.from({ length: half }, (_, column) => (
              <View key={column} style={{ width: columnWidth, gap: 12 }}>
                {[column, column + half]
                  .filter((index) => index < entries.length)
                  .map((index) => {
                    gridTargets.current[start + index] = {
                      group: mode,
                      x: column * (columnWidth + 8),
                    };
                    return option(entries[index], mode, start + index);
                  })}
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    );
  }

  gridTargets.current = {};
  const launcherLabelText =
    launchValue ||
    (variant === 'pill'
      ? `Search by ${word}`
      : 'Search city, area or university');

  let visibleSectionSlot = 0;
  const recentSlot = recents.length ? visibleSectionSlot++ : 0;
  const areaSlot = areas.length ? visibleSectionSlot++ : 0;
  const campusSlot = campuses.length ? visibleSectionSlot++ : 0;

  return (
    <>
      <AnimatedPressable
        ref={trigger as any}
        collapsable={false}
        onLayout={onTriggerLayout}
        accessibilityRole="button"
        accessibilityLabel="Open search"
        onPressIn={() => {
          if (!reduced && !visible) {
            pressScale.value = withTiming(0.98, {
              duration: 110,
              easing: PRESS_EASE,
            });
          }
        }}
        onPressOut={() => {
          if (!reduced) {
            pressScale.value = withTiming(1, {
              duration: 180,
              easing: PRESS_EASE,
            });
          }
        }}
        onPress={open}
        style={[
          styles.launcher,
          variant === 'pill' ? styles.hero : styles.compact,
          containerStyle,
          barStyle,
          launcherAnimStyle,
        ]}
      >
        <Text
          style={[styles.launcherText, variant === 'pill' && styles.heroText]}
          numberOfLines={1}
        >
          {launcherLabelText}
        </Text>
        <View
          style={[
            styles.searchAction,
            variant === 'pill' && styles.heroAction,
          ]}
        >
          <Ionicons
            name="search"
            size={variant === 'pill' ? 22 : 18}
            color="#fff"
          />
        </View>
      </AnimatedPressable>

      <Modal
        accessibilityLabel="Search Lebanon"
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => close()}
        onShow={() => {
          onModalPresented();
          if (autoFocus) input.current?.focus();
        }}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View
          ref={modalRootRef}
          collapsable={false}
          onLayout={onModalPresented}
          style={styles.backdrop}
        >
          {/* iOS: animate BlurView intensity directly (never parent opacity < 1, which disables UIVisualEffectView) */}
          {Platform.OS === 'ios' ? (
            <AnimatedBlurView
              pointerEvents="none"
              tint="systemThinMaterialLight"
              animatedProps={blurAnimatedProps}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              Platform.OS === 'ios'
                ? styles.iosFrostedWash
                : styles.androidFrostedWash,
              washAnimStyle,
            ]}
          />

          {/* Shared morphing white card (animates from measured bar rect -> full screen) */}
          <Animated.View
            accessibilityViewIsModal
            accessibilityLabel="Search Lebanon"
            style={[
              styles.morphShell,
              { borderColor: restingBorderColor },
              morphCardStyle,
            ]}
          >
            {/* Fixed-size inner search page frame -> zero Yoga relayout during morph */}
            <Animated.View
              style={[
                styles.innerPageFrame,
                {
                  width: dimensions.width,
                  height: dimensions.height,
                  // No paddingBottom here: the list scrolls edge-to-edge under the
                  // home indicator instead of leaving a blank white footer strip.
                  paddingTop: insets.top,
                },
                innerPageFrameStyle,
              ]}
            >
              <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <Animated.View style={[styles.header, headerAnimStyle]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back from search"
                    onPress={() => close()}
                    hitSlop={5}
                    style={styles.back}
                  >
                    <Animated.View style={backIconAnimStyle}>
                      <Ionicons
                        name="chevron-back"
                        size={25}
                        color="#263244"
                      />
                    </Animated.View>
                  </Pressable>
                  <View
                    style={[
                      styles.inputWrap,
                      focused && styles.inputFocused,
                    ]}
                  >
                    <Ionicons
                      name="search"
                      size={20}
                      color="#98a2b3"
                      style={{ marginLeft: 14 }}
                    />
                    <SearchSheetInput
                      ref={input}
                      value={value}
                      onChangeText={setValue}
                      onSubmit={submit}
                      onKeyboard={keyboard}
                      onComposing={setComposing}
                      listId={listId}
                      activeId={active >= 0 ? `${listId}-${active}` : undefined}
                      arabic={arabic}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                    />
                    {value ? (
                      <Pressable
                        accessibilityLabel="Clear search"
                        accessibilityRole="button"
                        onPress={() => {
                          setValue('');
                          input.current?.focus();
                        }}
                        hitSlop={4}
                        style={styles.clear}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#98a2b3"
                        />
                      </Pressable>
                    ) : null}
                  </View>
                </Animated.View>

                <ScrollView
                  ref={scroll}
                  onScroll={(event) => {
                    scrollY.current = event.nativeEvent.contentOffset.y;
                  }}
                  scrollEventThrottle={16}
                  style={styles.flex}
                  contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: 24 + insets.bottom },
                  ]}
                  keyboardShouldPersistTaps="always"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                >
                  {typed && (
                    <View style={styles.locationHeading}>
                      <Text style={styles.locationLabel}>Suggested places</Text>
                    </View>
                  )}
                  <View nativeID={listId}>
                    {typed ? (
                      <Animated.View style={sec0AnimStyle}>
                        {query.isFetching || composing ? (
                          <View style={styles.loading}>
                            <Text style={styles.context}>
                              Searching Lebanon...
                            </Text>
                            {[0, 1, 2].map((x) => (
                              <View key={x} style={styles.skeleton} />
                            ))}
                          </View>
                        ) : query.isError ? (
                          <View style={styles.empty}>
                            <Text style={styles.emptyTitle}>
                              Search is unavailable
                            </Text>
                            <Pressable
                              onPress={() => query.refetch()}
                              style={styles.retry}
                            >
                              <Text style={styles.link}>Try again</Text>
                            </Pressable>
                          </View>
                        ) : items.length ? (
                          items.map((item, index) =>
                            option(item, 'typed', index),
                          )
                        ) : (
                          <View style={styles.empty}>
                            <Ionicons
                              name="search-outline"
                              size={30}
                              color="#98a2b3"
                            />
                            <Text style={styles.emptyTitle}>
                              No places found.
                            </Text>
                            <Text style={styles.emptyText}>
                              Try another spelling, city, area or university.
                            </Text>
                          </View>
                        )}
                      </Animated.View>
                    ) : (
                      <>
                        {recentsError && (
                          <View style={styles.historyError}>
                            <Text style={styles.context}>
                              Recent searches unavailable.
                            </Text>
                            <Pressable onPress={onRetryRecents} hitSlop={8}>
                              <Text style={styles.link}>Retry</Text>
                            </Pressable>
                          </View>
                        )}
                        {recentPersistenceError && (
                          <Text style={styles.historyError}>
                            Recent searches are saved for this session only.
                          </Text>
                        )}
                        {section(
                          'Recently searched',
                          recents,
                          'recent',
                          0,
                          recentSlot,
                        )}
                        {section(
                          'Top areas',
                          areas,
                          'area',
                          recents.length,
                          areaSlot,
                        )}
                        {section(
                          'Top universities',
                          campuses,
                          'campus',
                          recents.length + areas.length,
                          campusSlot,
                        )}
                        {query.isFetching && (
                          <View style={styles.loading}>
                            <Text style={styles.context}>
                              Loading popular locations...
                            </Text>
                          </View>
                        )}
                        {query.isError && (
                          <View style={styles.empty}>
                            <Text style={styles.context}>
                              Popular locations are unavailable.
                            </Text>
                            <Pressable
                              onPress={() => query.refetch()}
                              style={styles.retry}
                            >
                              <Text style={styles.link}>Try again</Text>
                            </Pressable>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                  {typed && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => close(() => onSubmitText(value.trim()))}
                      style={styles.searchAll}
                    >
                      <Ionicons
                        name="search-outline"
                        size={17}
                        color="#ea3f4a"
                      />
                      <Text style={styles.link}>
                        Search all for “{value.trim()}”
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={17}
                        color="#ea3f4a"
                      />
                    </Pressable>
                  )}
                  {typed && items.some(isNearby) && (
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => void Linking.openURL(OSM_ATTRIBUTION.url)}
                      hitSlop={8}
                      style={styles.attribution}
                    >
                      <Text style={styles.attributionText}>
                        {OSM_ATTRIBUTION.text}
                      </Text>
                    </Pressable>
                  )}
                </ScrollView>
                <Text accessibilityLiveRegion="polite" style={styles.sr}>
                  {query.isFetching
                    ? 'Searching'
                    : typed
                      ? `${items.length} suggestions available`
                      : 'Popular locations and campuses'}
                </Text>
              </KeyboardAvoidingView>
            </Animated.View>

            {/* Launcher pill ghost row inside morphShell: cleanly occupies p in [0, 0.18] with zero header overlap */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.launcherGhost,
                variant === 'pill' ? styles.heroGhostPad : styles.compactGhostPad,
                flatLauncherStyle.paddingLeft != null
                  ? { paddingLeft: flatLauncherStyle.paddingLeft }
                  : null,
                flatLauncherStyle.paddingRight != null
                  ? { paddingRight: flatLauncherStyle.paddingRight }
                  : null,
                launcherGhostStyle,
              ]}
            >
              <Text
                style={[
                  styles.launcherText,
                  variant === 'pill' && styles.heroText,
                ]}
                numberOfLines={1}
              >
                {launcherLabelText}
              </Text>
              <View
                style={[
                  styles.searchAction,
                  variant === 'pill' && styles.heroAction,
                ]}
              >
                <Ionicons
                  name="search"
                  size={variant === 'pill' ? 22 : 18}
                  color="#fff"
                />
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  backdrop: { flex: 1 },
  iosFrostedWash: {
    backgroundColor: 'rgba(244, 245, 247, 0.72)',
  },
  androidFrostedWash: {
    backgroundColor: 'rgba(240, 242, 246, 0.92)',
  },
  morphShell: {
    position: 'absolute',
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 22,
  },
  innerPageFrame: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: '#fff',
  },
  launcherGhost: {
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroGhostPad: {
    paddingLeft: 22,
    paddingRight: 6,
  },
  compactGhostPad: {
    paddingLeft: 16,
    paddingRight: 4,
  },
  launcher: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 999,
    gap: 8,
  },
  hero: {
    height: 62,
    paddingLeft: 22,
    paddingRight: 6,
    borderWidth: 2,
    borderColor: '#ea3f4a',
  },
  compact: {
    minHeight: 44,
    paddingVertical: 5,
    paddingLeft: 16,
    paddingRight: 4,
  },
  launcherText: {
    fontFamily: Studently.type.body,
    fontSize: 13,
    color: '#667085',
    flex: 1,
  },
  heroText: { fontSize: 15 },
  searchAction: {
    width: 32,
    height: 32,
    borderRadius: 99,
    backgroundColor: '#ea3f4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAction: { width: 46, height: 46 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingRight: 12,
    paddingLeft: 4,
    gap: 2,
    borderBottomWidth: 0,
    minHeight: 68,
    backgroundColor: '#fff',
  },
  back: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 28,
    backgroundColor: '#fff',
    height: 48,
    boxShadow: '0 3px 14px rgba(16,24,40,0.10)',
  },
  clear: {
    height: 40,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingBottom: 24 },
  locationHeading: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: '#f2f4f7',
    borderBottomWidth: 1,
  },
  locationLabel: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 12,
    color: '#344054',
  },
  section: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f1f4',
  },
  sectionHead: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 15,
    color: '#667085',
    flex: 1,
  },
  clearRecents: {
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 4,
    paddingLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  horizontalGrid: { flexGrow: 0, flexShrink: 0, minHeight: 140 },
  gridContent: { paddingHorizontal: 16, gap: 8 },
  gridRow: { width: '100%', height: 64, paddingVertical: 4, borderRadius: 10 },
  recentList: { paddingHorizontal: 16, gap: 8 },
  recentRow: {
    height: 64,
    width: '100%',
    paddingVertical: 4,
    borderRadius: 10,
  },
  inputFocused: { borderColor: '#ea3f4a' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomColor: '#f2f4f7',
    borderBottomWidth: 1,
    minHeight: 88,
  },
  selected: { backgroundColor: '#fff1f2', borderColor: '#f9b5ba' },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
    color: '#111928',
  },
  translation: { fontSize: 12, lineHeight: 19, color: '#667085' },
  context: {
    fontFamily: Studently.type.body,
    fontSize: 12,
    lineHeight: 19,
    color: '#667085',
  },
  badge: {
    fontFamily: Studently.type.bodyMedium,
    fontSize: 10,
    color: '#667085',
    borderColor: '#e4e7ec',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  rtl: { writingDirection: 'rtl', textAlign: 'right' },
  loading: { padding: 20, gap: 16 },
  skeleton: { height: 38, borderRadius: 8, backgroundColor: '#f3f4f6' },
  empty: {
    paddingHorizontal: 28,
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 16,
    color: '#344054',
  },
  emptyText: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 22,
    color: '#667085',
    textAlign: 'center',
  },
  retry: { padding: 12 },
  link: { fontFamily: Studently.type.bodyMedium, fontSize: 14, color: '#ea3f4a' },
  searchAll: {
    margin: 16,
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbd5d8',
    backgroundColor: '#fff8f8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  historyError: { padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  attribution: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  attributionText: {
    fontFamily: Studently.type.body,
    fontSize: 11,
    color: '#98a2b3',
  },
  sr: { position: 'absolute', height: 1, width: 1, overflow: 'hidden', opacity: 0 },
});
