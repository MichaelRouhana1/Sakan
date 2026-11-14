import ReactBitsSquishSwitch from './ReactBitsSquishSwitch.web';
import { squishColors, squishSize, squishStretch, type SquishSwitchProps } from './SquishSwitch.types';

export function SquishSwitch({ value, onValueChange, accessibilityLabel, disabled }: SquishSwitchProps) {
  return <ReactBitsSquishSwitch checked={value} onChange={onValueChange}
    ariaLabel={accessibilityLabel} disabled={disabled}
    width={squishSize.width} height={squishSize.height} radius={squishSize.height / 2} stretch={squishStretch}
    trackColor={squishColors.track} trackOnColor={squishColors.trackOn}
    thumbColor={squishColors.thumb} thumbOnColor={squishColors.thumbOn} />;
}
