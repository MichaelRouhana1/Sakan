import type {StyleProp, ViewStyle} from 'react-native';

export type FavoriteButtonProps = {
  saved: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  iconSize?: number;
  idleColor?: string;
  variant?: 'default' | 'overlay';
  style?: StyleProp<ViewStyle>;
};

export const favoriteColor = '#EA3F4A';
export const favoriteIdleColor = '#475569';
export const favoritePulse = {duration: 560, swapAt: .4, dotSize: .3, overshoot: 1.7, beat: .03};
