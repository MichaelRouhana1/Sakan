import { BorderBeam } from "border-beam";
import { MetalFx } from "metal-fx";
import type { CSSProperties, ReactNode } from "react";
import { Skoun } from "@/constants/theme";

/** Full-shape mask — same recipe as metal-fx `MetalBadge`, not the 1px ring punch. */
function popularMask(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const radius = Math.min(width, height) / 2;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.fill();
}

const FRAME = {
  display: "flex",
  flexGrow: 1,
  flexBasis: 280,
  maxWidth: 380,
  minWidth: 260,
  alignSelf: "stretch",
  overflow: "visible",
} as const;

/**
 * Mono blobs in border-beam are light grey. On this white button / light card
 * they vanish, so brightness < 1 turns them charcoal — same outside bloom as
 * the playground, inverted for a light surface.
 */
const CTA_GLOW_BRIGHTNESS = 0.22;

export function PopularPackBeam({
  children,
  active = true,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <BorderBeam
      size="pulse-inner"
      colorVariant="mono"
      theme="light"
      borderRadius={12}
      brightness={CTA_GLOW_BRIGHTNESS}
      active={active}
      style={FRAME}
    >
      {children}
    </BorderBeam>
  );
}

const CTA_BEAM_CLASS = "whishPayBeam";

/**
 * This beam is nested inside the card's PopularPackBeam. That outer beam's
 * `[data-beam=id] [data-beam-bloom]` descendant rule leaks onto our bloom and
 * turns it into a 1px XOR ring (padding + content-box mask + clip-path), which
 * reads as a hard outline around the button. Reset those here.
 */
const CTA_BEAM_CSS = `
.${CTA_BEAM_CLASS}[data-beam] > [data-beam-bloom] {
  padding: 0;
  -webkit-mask: none;
  mask: none;
  clip-path: none;
}
`;

const CTA_WRAP = {
  display: "flex",
  width: "100%",
  marginTop: 8,
  overflow: "visible",
  isolation: "isolate",
  "--pulse-glow-boost": "1.25",
  // 4.5 was tuned while the bloom was accidentally masked to a 1px ring.
  // With the real bloom visible, keep it a soft haze.
  "--beam-bloom-opacity": "0.7",
  "--beam-inner-opacity": "1.4",
} as CSSProperties;

export function PopularBadge({ active = true }: { active?: boolean }) {
  return (
    <MetalFx
      preset="chromatic"
      theme="dark"
      paused={!active}
      strength={0.85}
      shaderScale={1.6}
      glowGain={1.4}
      mask={popularMask}
      glowMode="ring"
      innerShadow
      borderRadius={999}
      style={BADGE_FX}
    >
      <span style={BADGE_HOST}>
        <span aria-hidden style={BADGE_CORE} />
        <span aria-hidden style={BADGE_SHEEN} />
        <span style={BADGE_LABEL}>Popular</span>
      </span>
    </MetalFx>
  );
}

const BADGE_FX: CSSProperties = {
  background: "#FFFFFF",
  borderRadius: 999,
  overflow: "visible",
};

const BADGE_HOST: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "4px 10px",
  borderRadius: 999,
  background: "transparent",
};

const BADGE_CORE: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: 999,
  pointerEvents: "none",
  background: `radial-gradient(ellipse 42% 42% at 50% 50%, #FFFFFF 36%, rgba(0,0,0,0) 120%)`,
  opacity: 0.95,
};

const BADGE_SHEEN: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: 999,
  pointerEvents: "none",
  boxShadow:
    "inset 0 0 8px 0 rgba(255,255,255,0.41), inset 0 0 0 0.8px rgba(255,255,255,0.5), inset 0 0.8px 0 0 rgba(255,255,255,0.78)",
};

const BADGE_LABEL: CSSProperties = {
  position: "relative",
  color: Skoun.color.ink,
  fontFamily: Skoun.type.bodySemi,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.4,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

const CTA: CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  minHeight: 44,
  margin: 0,
  padding: "0 14px",
  border: "1px solid #DDDDDD",
  borderRadius: 8,
  background: "#FFFFFF",
  color: Skoun.color.ink,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: Skoun.type.bodySemi,
  fontSize: 14,
  fontWeight: 600,
};

export function WhishPayButton({
  label,
  disabled,
  onPress,
  active = true,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <>
      <style>{CTA_BEAM_CSS}</style>
      <BorderBeam
        size="pulse-outside"
        colorVariant="mono"
        theme="light"
        borderRadius={8}
        brightness={CTA_GLOW_BRIGHTNESS}
        active={active}
        className={CTA_BEAM_CLASS}
        style={CTA_WRAP}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={onPress}
          style={{
            ...CTA,
            opacity: disabled ? 0.55 : 1,
            cursor: disabled ? "default" : "pointer",
          }}
        >
          {label}
        </button>
      </BorderBeam>
    </>
  );
}
