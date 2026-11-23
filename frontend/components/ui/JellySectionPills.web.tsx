import { useEffect, useLayoutEffect, useRef } from "react";
import { Lister } from "@/constants/listerTheme";
import JellyRadio from "@/components/listings/edit/JellyRadio";
import type { JellySectionPillsProps } from "./JellySectionPills.types";

export function JellySectionPills({
  items,
  activeId,
  onSelect,
  ariaLabel = "Sections",
}: JellySectionPillsProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const wheelTarget = useRef(0);
  const wheelFrame = useRef(0);

  useLayoutEffect(() => {
    const root = scroller.current;
    const chip = root?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!root || !chip) return;
    const pad = 12;
    const chipBox = chip.getBoundingClientRect();
    const rootBox = root.getBoundingClientRect();
    let delta = 0;
    if (chipBox.left < rootBox.left + pad) delta = chipBox.left - (rootBox.left + pad);
    else if (chipBox.right > rootBox.right - pad) delta = chipBox.right - (rootBox.right - pad);
    if (Math.abs(delta) < 1) return;
    const next = Math.max(0, root.scrollLeft + delta);
    if (wheelFrame.current) cancelAnimationFrame(wheelFrame.current);
    wheelFrame.current = 0;
    wheelTarget.current = next;
    root.scrollTo({ left: next, behavior: "smooth" });
  }, [activeId]);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const el: HTMLDivElement = root;
    wheelTarget.current = el.scrollLeft;

    function tick() {
      const diff = wheelTarget.current - el.scrollLeft;
      if (Math.abs(diff) < 0.5) {
        el.scrollLeft = wheelTarget.current;
        wheelFrame.current = 0;
        return;
      }
      el.scrollLeft += diff * 0.22;
      wheelFrame.current = requestAnimationFrame(tick);
    }

    function onWheel(event: WheelEvent) {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return;
      let delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= el.clientWidth;
      if (delta === 0) return;
      if (!wheelFrame.current) wheelTarget.current = el.scrollLeft;
      const next = Math.min(max, Math.max(0, wheelTarget.current + delta));
      if (next === wheelTarget.current) return;
      event.preventDefault();
      event.stopPropagation();
      wheelTarget.current = next;
      if (!wheelFrame.current) wheelFrame.current = requestAnimationFrame(tick);
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelFrame.current) cancelAnimationFrame(wheelFrame.current);
    };
  }, []);

  return (
    <div className="edit-section-pills" ref={scroller} data-testid="filter-section-pills">
      <JellyRadio
        ariaLabel={ariaLabel}
        items={items.map((item) => ({ value: item.id, label: item.label }))}
        value={activeId}
        onChange={(next) => onSelect(next)}
        chipColor={Lister.color.primaryMist}
        activeColor={Lister.color.ink}
        textColor={Lister.color.ink}
        activeTextColor={Lister.color.surface}
        size="sm"
        gap={2}
        radius={14}
      />
    </div>
  );
}
