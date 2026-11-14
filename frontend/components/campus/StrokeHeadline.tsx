import { LText } from "@/components/lister/Typography";

type Props = {
  text: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
};

/** Native headline. The draw-on stroke plays on web. */
export function StrokeHeadline({
  text,
  fontSize,
  lineHeight,
  letterSpacing,
}: Props) {
  return (
    <LText
      accessibilityRole="header"
      variant="display"
      style={{ fontSize, lineHeight, letterSpacing, alignSelf: "flex-start" }}
    >
      {text}
    </LText>
  );
}
