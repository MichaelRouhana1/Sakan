// Motion adapted from React Bits' Rubber Segment (David Haz).
// https://reactbits.dev/micro/rubber-segment — see RubberSegment.LICENSE.md.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { rubberTiming as timing, type RubberSegmentProps } from './RubberSegment.types';
import './RubberSegment.css';

type Slot = { left: number; right: number; top: number; height: number };
const spring = { type: 'spring' as const, duration: timing.land, bounce: 0 };

export function RubberSegment<T extends string>({ items, value, onChange }: RubberSegmentProps<T>) {
  const root = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const slots = useRef<Slot[]>([]);
  const selected = useRef(value);
  selected.current = value;
  const previous = useRef(value);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const animations = useRef<{ stop: () => void }[]>([]);
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();
  const left = useMotionValue(0);
  const right = useMotionValue(0);
  const top = useMotionValue(0);
  const height = useMotionValue(44);
  const width = useTransform(() => Math.max(0, right.get() - left.get()));
  const layoutKey = JSON.stringify(items);

  function stop() {
    ++generation.current;
    clearTimeout(timer.current);
    animations.current.forEach(animation => animation.stop());
    animations.current = [];
  }

  function jump(slot: Slot) {
    stop();
    left.jump(slot.left); right.jump(slot.right);
    top.jump(slot.top); height.jump(slot.height);
  }

  useLayoutEffect(() => {
    let mounted = true;
    const measure = () => {
      if (!mounted || !root.current) return;
      const track = root.current.getBoundingClientRect();
      slots.current = buttons.current.map(button => {
        const rect = button!.getBoundingClientRect();
        return { left: rect.left - track.left, right: rect.right - track.left, top: rect.top - track.top, height: rect.height };
      });
      const slot = slots.current[items.findIndex(item => item.value === selected.current)];
      if (slot) { jump(slot); setReady(true); }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    buttons.current.forEach(button => { if (button) observer.observe(button); });
    void document.fonts?.ready.then(measure);
    return () => { mounted = false; observer.disconnect(); };
    // Re-measure counts and font/viewport changes, without animating a data refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  useEffect(() => {
    const changed = previous.current !== value;
    previous.current = value;
    const target = slots.current[items.findIndex(item => item.value === value)];
    if (!target || (!changed && !reduced)) return;
    if (reduced) { jump(target); return; }
    stop();
    const token = generation.current;
    const direction = Math.sign(target.left + target.right - left.get() - right.get()) || 1;
    const tween = { duration: timing.stretch, ease: [.23, 1, .32, 1] as [number, number, number, number] };
    // The leading edge reaches ahead while the trailing edge holds, then catches up.
    animations.current.push(
      animate(left, Math.min(left.get(), target.left), tween),
      animate(right, Math.max(right.get(), target.right), tween),
      animate(top, target.top, spring),
      animate(height, target.height, spring),
    );
    timer.current = setTimeout(() => {
      if (token !== generation.current) return;
      const lead = direction > 0 ? right : left;
      const trail = direction > 0 ? left : right;
      const leadTo = direction > 0 ? target.right : target.left;
      const trailTo = direction > 0 ? target.left : target.right;
      animations.current.push(animate(lead, leadTo, spring));
      const landing = animate(trail, trailTo + direction * timing.squash, spring);
      animations.current.push(landing);
      void landing.then(() => {
        if (token === generation.current) animations.current.push(animate(trail, trailTo, { ...spring, duration: timing.relax }));
      });
    }, timing.handoff);
    // Motion values and geometry stay stable between selections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced]);

  useEffect(() => () => stop(), []);

  function keyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % items.length
      : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (index - 1 + items.length) % items.length : null;
    if (next === null) return;
    event.preventDefault(); buttons.current[next]?.focus(); onChange(items[next].value);
  }

  return <div ref={root} className="studently-rubber-segment" role="group" aria-label="Listing filters">
    <motion.span aria-hidden="true" className="studently-rubber-segment__thumb" style={{ left, top, width, height, visibility: ready ? 'visible' : 'hidden' }} />
    {items.map((item, index) => <button key={item.value} ref={element => { buttons.current[index] = element; }}
      type="button" aria-label={`Filter ${item.label}`} aria-pressed={item.value === value}
      className="studently-rubber-segment__item" onClick={() => onChange(item.value)} onKeyDown={event => keyDown(event, index)}>
      <span>{item.label}</span><span className="studently-rubber-segment__count">{item.count}</span>
    </button>)}
  </div>;
}
