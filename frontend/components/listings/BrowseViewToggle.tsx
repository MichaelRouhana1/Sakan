import { SegmentedPillTrack } from "@/components/listings/SegmentedPillTrack";

export type BrowseViewMode = "list" | "map";

type Props = {
  value: BrowseViewMode;
  onChange: (next: BrowseViewMode) => void;
};

const OPTIONS = [
  { value: "list" as const, label: "List", icon: "list-outline" as const },
  { value: "map" as const, label: "Map", icon: "map-outline" as const },
];

/** List / Map — hug content in the title row (equalWidth gets crushed to 0 width). */
export function BrowseViewToggle({ value, onChange }: Props) {
  return (
    <SegmentedPillTrack
      value={value}
      options={OPTIONS}
      onChange={onChange}
      appearance="chip"
      equalWidth={false}
      accessibilityLabel="Browse view"
    />
  );
}
