import { useLayoutEffect, useRef } from "react";
import { WIZARD_STEPS } from "@/constants/listingWizard";
import { Lister } from "@/constants/listerTheme";
import JellyRadio from "@/components/listings/edit/JellyRadio";
import { chipLabel } from "@/components/listings/edit/sectionChipLabel";

export { chipLabel };

type Props = {
  activeId: string;
  onSelect: (id: string) => void;
};

export function SectionPills({ activeId, onSelect }: Props) {
  const scroller = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = scroller.current;
    const chip = root?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!root || !chip) return;
    const chipBox = chip.getBoundingClientRect();
    const rootBox = root.getBoundingClientRect();
    if (chipBox.left < rootBox.left + 8) {
      root.scrollLeft -= rootBox.left - chipBox.left + 16;
    } else if (chipBox.right > rootBox.right - 8) {
      root.scrollLeft += chipBox.right - rootBox.right + 16;
    }
  }, [activeId]);

  return (
    <div className="edit-section-pills" ref={scroller}>
      <JellyRadio
        ariaLabel="Listing sections"
        items={WIZARD_STEPS.map((step) => ({
          value: step.id,
          label: chipLabel(step.id),
        }))}
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
