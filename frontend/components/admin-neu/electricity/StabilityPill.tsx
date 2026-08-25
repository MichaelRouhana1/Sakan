import { H } from "../h";
import { stabilityLabel, type PowerStability } from "./types";

const TONE: Record<
  PowerStability,
  { text: string; glow: string; dot: string }
> = {
  stable: {
    text: "text-moss",
    glow: "shadow-glow-moss",
    dot: "bg-moss shadow-dot-moss",
  },
  moderate: {
    text: "text-ochre",
    glow: "shadow-glow-ochre",
    dot: "bg-ochre shadow-dot-ochre",
  },
  severe: {
    text: "text-ember",
    glow: "shadow-glow-ember",
    dot: "bg-ember shadow-dot-ember",
  },
};

export function StabilityPill({
  status,
  live = true,
}: {
  status: PowerStability;
  live?: boolean;
}) {
  const tone = TONE[status];
  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold",
        tone.text,
        tone.glow,
      ].join(" ")}
    >
      <H
        as="span"
        className={[
          "h-2 w-2 rounded-full",
          tone.dot,
          live ? "neu-live-dot" : "",
        ].join(" ")}
        aria-hidden
      />
      {stabilityLabel(status)}
    </H>
  );
}
