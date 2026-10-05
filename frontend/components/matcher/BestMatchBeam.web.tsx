import { BorderBeam } from "border-beam";
import { Children, type ReactNode } from "react";
import { View } from "react-native";

/**
 * Playground "Rotate / Large / Colorful". `md` is that Large traveling stroke.
 * Dark theme is the luminous rainbow from the playground. Its default stroke is
 * tuned for a dark card, so on these photos the same layers are brought up to
 * full strength — otherwise the beam sits under 0.3 opacity and disappears.
 * The badge sits outside the beam because the beam clips overflow to the edge.
 */
const TIP_CSS = `
@keyframes skoun-match-tip {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes skoun-match-tip {
    from, to { opacity: 1; transform: none; }
  }
}
.skounBestBeam[data-beam][data-active]::after,
.skounBestBeam[data-beam][data-fading]::after {
  opacity: 1 !important;
}
.skounBestBeam[data-beam][data-active]::before,
.skounBestBeam[data-beam][data-fading]::before {
  opacity: 1 !important;
}
.skounBestBeam[data-beam] [data-beam-bloom] {
  opacity: 0.85 !important;
}
[data-best-match-tip] {
  overflow: auto;
  animation: skoun-match-tip 160ms ease-out;
}
`;

export function BestMatchBeam({
  active,
  raised = false,
  children,
}: {
  active: boolean;
  raised?: boolean;
  children: ReactNode;
}) {
  if (!active) return children;
  const [card, ...overlay] = Children.toArray(children);
  return (
    <>
      <style>{TIP_CSS}</style>
      <View
        style={{
          position: "relative",
          width: "100%",
          zIndex: raised ? 6 : 1,
        }}
      >
        <BorderBeam
          size="md"
          colorVariant="colorful"
          theme="dark"
          borderRadius={16}
          className="skounBestBeam"
          style={{ display: "block", width: "100%" }}
        >
          {card}
        </BorderBeam>
        {overlay}
      </View>
    </>
  );
}
