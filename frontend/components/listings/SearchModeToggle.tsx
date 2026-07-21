import { SegmentedPillTrack } from "@/components/listings/SegmentedPillTrack";

export type SearchMode = "standard" | "university";

type Props = {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
};

const OPTIONS = [
  { value: "standard" as const, label: "Cities" },
  { value: "university" as const, label: "University Hub" },
];

/** Cities / University Hub — equal slots filling the row; Filters is a fixed icon beside it. */
export function SearchModeToggle({ mode, onChange }: Props) {
  return (
    <SegmentedPillTrack
      value={mode}
      options={OPTIONS}
      onChange={onChange}
      appearance="glass"
      equalWidth
      accessibilityLabel="Search mode"
    />
  );
}
