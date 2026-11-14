// Native adaptation of React Bits' Rubber Segment. See RubberSegment.LICENSE.md.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { Studently } from '@/constants/theme';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { rubberTiming as timing, type RubberSegmentProps } from './RubberSegment.types';

export function RubberSegment<T extends string>({ items, value, onChange }: RubberSegmentProps<T>) {
  const [slots, setSlots] = useState<Record<string, LayoutRectangle>>({});
  const previous = useRef({ value, slots });
  const generation = useRef(0);
  const reduced = useReducedMotion();
  const left = useRef(new Animated.Value(0)).current;
  const right = useRef(new Animated.Value(0)).current;
  const top = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(44)).current;

  useEffect(() => {
    const target = slots[value];
    const before = previous.current;
    previous.current = { value, slots };
    if (!target) return;
    const token = ++generation.current;
    [left, right, top, height].forEach(edge => edge.stopAnimation());
    if (before.slots !== slots || reduced || before.value === value) {
      left.setValue(target.x); right.setValue(target.x + target.width);
      top.setValue(target.y); height.setValue(target.height);
      return;
    }
    const origin = slots[before.value] ?? target;
    const move = (edge: Animated.Value, toValue: number, duration: number) => Animated.timing(edge, {
      toValue, duration: duration * 1000, easing: Easing.bezier(.23, 1, .32, 1), useNativeDriver: false,
    });
    Animated.parallel([
      move(left, Math.min(origin.x, target.x), timing.stretch),
      move(right, Math.max(origin.x + origin.width, target.x + target.width), timing.stretch),
      move(top, target.y, timing.land), move(height, target.height, timing.land),
    ]).start();
    const timer = setTimeout(() => {
      if (token !== generation.current) return;
      const direction = target.x + target.width / 2 >= origin.x + origin.width / 2 ? 1 : -1;
      const trail = direction > 0 ? left : right;
      const trailTo = direction > 0 ? target.x : target.x + target.width;
      Animated.parallel([
        move(direction > 0 ? right : left, direction > 0 ? target.x + target.width : target.x, timing.land),
        move(trail, trailTo + direction * timing.squash, timing.land),
      ]).start(({ finished }) => {
        if (finished && token === generation.current) move(trail, trailTo, timing.relax).start();
      });
    }, timing.handoff);
    return () => { clearTimeout(timer); ++generation.current; [left, right, top, height].forEach(edge => edge.stopAnimation()); };
  }, [value, slots, reduced, left, right, top, height]);

  return <View style={styles.track} accessibilityLabel="Listing filters">
    {slots[value] ? <Animated.View pointerEvents="none" style={[styles.thumb, { left, top, height, width: Animated.subtract(right, left) }]} /> : null}
    {items.map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityLabel={`Filter ${item.label}`}
      accessibilityState={{ selected: item.value === value }} onPress={() => onChange(item.value)}
      onLayout={event => {
        const rect = event.nativeEvent.layout;
        setSlots(current => {
          const old = current[item.value];
          return old && ['x', 'y', 'width', 'height'].every(key => old[key as keyof LayoutRectangle] === rect[key as keyof LayoutRectangle]) ? current : { ...current, [item.value]: rect };
        });
      }} style={styles.item}>
      <Text style={[styles.label, item.value === value && styles.selected]}>{item.label}</Text>
      <Text style={[styles.count, item.value === value && styles.selected]}>{item.count}</Text>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, position: 'relative' },
  thumb: { position: 'absolute', borderRadius: 8, backgroundColor: '#FDECEE' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44, paddingHorizontal: 12, borderRadius: 8 },
  label: { fontFamily: Studently.type.bodyMedium, fontSize: 14, color: '#5E5A55' },
  count: { fontFamily: Studently.type.body, fontSize: 13, color: '#6B6460' },
  selected: { color: '#A82D36' },
});
