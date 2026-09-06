import Svg, { G, Line } from "react-native-svg";
import { CAP_DASHES, CAP_VIEWBOX } from "@/components/campus/heroCapGeometry";
import { Skoun } from "@/constants/theme";

const RAD = Math.PI / 180;

/** Static graduation cap for native — same dashes as the web version, at rest. */
export function HeroCap() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={CAP_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      accessible={false}
    >
      <G
        stroke={Skoun.color.primary}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      >
        {CAP_DASHES.map((d, i) => {
          const a = d.rest * RAD;
          const hx = Math.cos(a) * d.len * 0.5;
          const hy = Math.sin(a) * d.len * 0.5;
          return (
            <Line
              key={i}
              x1={d.x - hx}
              y1={d.y - hy}
              x2={d.x + hx}
              y2={d.y + hy}
              opacity={d.o}
            />
          );
        })}
      </G>
    </Svg>
  );
}
