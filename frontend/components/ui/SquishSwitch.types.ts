export type SquishSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  colors?: Partial<SquishColors>;
};

export type SquishColors = { track: string; trackOn: string; thumb: string; thumbOn: string };

export const squishSize = { width: 56, height: 28 };
export const squishStretch = 64;
export const squishColors: SquishColors = {
  track: '#D1D5DB',
  trackOn: '#EA3F4A',
  thumb: '#EA3F4A',
  thumbOn: '#F2F2F2',
};
