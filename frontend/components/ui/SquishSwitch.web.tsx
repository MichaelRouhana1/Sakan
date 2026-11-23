import ReactBitsSquishSwitch from './ReactBitsSquishSwitch.web';
import { squishColors, squishSize, squishStretch, type SquishSwitchProps } from './SquishSwitch.types';

export function SquishSwitch({ value, onValueChange, accessibilityLabel, disabled, colors }: SquishSwitchProps) {
  const c = { ...squishColors, ...colors };
  return <ReactBitsSquishSwitch checked={value} onChange={onValueChange}
    ariaLabel={accessibilityLabel} disabled={disabled}
    width={squishSize.width} height={squishSize.height} radius={squishSize.height / 2} stretch={squishStretch}
    trackColor={c.track} trackOnColor={c.trackOn}
    thumbColor={c.thumb} thumbOnColor={c.thumbOn} />;
}
