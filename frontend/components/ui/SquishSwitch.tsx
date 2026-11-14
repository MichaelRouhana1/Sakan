// Native adaptation of React Bits' Squish Switch. See SquishSwitch.LICENSE.md.
import { useEffect, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { squishColors, squishSize, squishStretch, type SquishSwitchProps } from './SquishSwitch.types';

const peakStretch = 1 + .4 * squishStretch / 100;
const inset = 3;
const thumb = squishSize.height - inset * 2;
const travel = squishSize.width - inset * 2 - thumb;

export function SquishSwitch(props: SquishSwitchProps) {
  const {value, disabled = false, onValueChange, accessibilityLabel} = props;
  const reduced = useReducedMotion();
  const latest = useRef({ ...props, reduced });
  latest.current = { ...props, reduced };
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const stretch = useRef(new Animated.Value(1)).current;
  const position = useRef(value ? 1 : 0);
  const origin = useRef(0);
  const previous = useRef(value);
  const dragged = useRef(false);

  useEffect(() => {
    const listener = progress.addListener(({value: next}) => { position.current = next; });
    return () => progress.removeListener(listener);
  }, [progress]);

  useEffect(() => {
    const changed = previous.current !== value;
    previous.current = value;
    if (reduced || !changed) { progress.setValue(value ? 1 : 0); stretch.setValue(1); return; }
    const animation = Animated.parallel([
      Animated.spring(progress, {toValue: value ? 1 : 0, stiffness: 170, damping: 21.5, mass: .9, useNativeDriver: false}),
      Animated.sequence([
        Animated.timing(stretch, {toValue: peakStretch, duration: 90, useNativeDriver: false}),
        Animated.spring(stretch, {toValue: 1, stiffness: 320, damping: 30, useNativeDriver: false}),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [value, reduced, progress, stretch]);

  const settle = () => {
    if (latest.current.reduced) { progress.setValue(latest.current.value ? 1 : 0); stretch.setValue(1); return; }
    Animated.parallel([
      Animated.spring(progress, {toValue: latest.current.value ? 1 : 0, stiffness: 170, damping: 21.5, mass: .9, useNativeDriver: false}),
      Animated.spring(stretch, {toValue: 1, stiffness: 320, damping: 30, useNativeDriver: false}),
    ]).start();
  };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => !latest.current.disabled && Math.abs(gesture.dx) > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => {
      dragged.current = true;
      progress.stopAnimation();
      origin.current = position.current;
    },
    onPanResponderMove: (_, gesture) => {
      const next = Math.max(0, Math.min(1, origin.current + gesture.dx / travel));
      position.current = next;
      progress.setValue(next);
      stretch.setValue(latest.current.reduced ? 1 : 1 + Math.min(peakStretch - 1, Math.abs(gesture.vx) * .1));
    },
    onPanResponderRelease: () => {
      const next = position.current > .5;
      if (!latest.current.disabled && next !== latest.current.value) latest.current.onValueChange(next);
      settle();
    },
    onPanResponderTerminate: settle,
  })).current;

  return <View {...pan.panHandlers} style={styles.control} collapsable={false}><Pressable accessibilityRole="switch" accessibilityLabel={accessibilityLabel}
    accessibilityState={{checked: value, disabled}} disabled={disabled}
    hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}
    onPressIn={() => { dragged.current = false; }}
    onPress={() => { if (!dragged.current && !disabled) onValueChange(!value); }}
    style={[StyleSheet.absoluteFill, disabled && styles.disabled]}>
    <Animated.View pointerEvents="none" style={[styles.track, {backgroundColor: progress.interpolate({inputRange: [0, 1], outputRange: [squishColors.track, squishColors.trackOn], extrapolate: 'clamp'})}]} />
    <Animated.View pointerEvents="none" style={[styles.thumb, {
      backgroundColor: progress.interpolate({inputRange: [0, 1], outputRange: [squishColors.thumb, squishColors.thumbOn], extrapolate: 'clamp'}),
      transform: [
        {translateX: progress.interpolate({inputRange: [0, 1], outputRange: [inset, inset + travel]})},
        {scaleX: stretch}, {scaleY: stretch.interpolate({inputRange: [1, peakStretch], outputRange: [1, 1 / peakStretch]})},
      ],
    }]} />
  </Pressable></View>;
}

const styles = StyleSheet.create({
  control: {width: squishSize.width, height: 44},
  disabled: {opacity: .5},
  track: {position: 'absolute', left: 0, right: 0, top: 8, height: squishSize.height, borderRadius: squishSize.height / 2},
  thumb: {position: 'absolute', top: inset + 8, left: 0, width: thumb, height: thumb, borderRadius: thumb / 2},
});
