import { SegmentedPillTrack } from "@/components/listings/SegmentedPillTrack";

export type ListingSort = "newest" | "price_asc";

type Props = {
  value: ListingSort;
  onChange: (sort: ListingSort) => void;
};

const OPTIONS = [
  { value: "newest" as const, label: "Newest" },
  { value: "price_asc" as const, label: "Lowest price" },
];

/** Newest / Lowest price — same sliding thumb motion as mode + list/map. */
export function ListingSortControl({ value, onChange }: Props) {
  return (
    <SegmentedPillTrack
      value={value}
      options={OPTIONS}
      onChange={onChange}
      appearance="chip"
      equalWidth
      accessibilityLabel="Sort listings"
    />
  );
}
