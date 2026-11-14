export type RubberSegmentProps<T extends string> = {
  items: readonly { value: T; label: string; count: number | string }[];
  value: T;
  onChange: (value: T) => void;
};

export const rubberTiming = { stretch: .19, handoff: 150, land: .3, relax: .16, squash: 3 };
