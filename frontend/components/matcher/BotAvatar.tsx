import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import LottieView from "lottie-react-native";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { skounShadow } from "@/lib/skounShadow";

const BOT_LOTTIE = require("../../assets/lottie/find-place-bot.json");
const STILL_FRAME = Math.floor((BOT_LOTTIE.op - BOT_LOTTIE.ip) * 0.55);

export function BotAvatar({
  playing = false,
  playOnHover = false,
  size = 32,
}: {
  playing?: boolean;
  playOnHover?: boolean;
  size?: number;
}) {
  const animation = useRef<LottieView>(null);
  const [pressed, setPressed] = useState(false);
  const reduce = useReducedMotion();
  // Touch is the mobile equivalent of hovering the bot in the header.
  const active = !reduce && (playOnHover ? pressed : playing);
  const syncPlayback = useCallback(() => {
    if (active) animation.current?.play();
    else if (playOnHover && !reduce) animation.current?.pause();
    else animation.current?.play(STILL_FRAME, STILL_FRAME);
  }, [active, playOnHover, reduce]);

  useEffect(syncPlayback, [syncPlayback]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents={playOnHover ? "auto" : "none"}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        width: size,
        height: size,
        ...skounShadow({ blur: 4, y: 3, opacity: 0.35 }),
      }}
    >
      <LottieView
        ref={animation}
        source={BOT_LOTTIE}
        autoPlay={false}
        loop={active}
        resizeMode="contain"
        onAnimationLoaded={() => {
          if (active) animation.current?.play();
          else animation.current?.play(STILL_FRAME, STILL_FRAME);
        }}
        style={{ width: size, height: size }}
      />
    </View>
  );
}
