import { useEffect, useMemo, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Skoun } from "@/constants/theme";
import { institutionLogoCandidates } from "@/lib/institutionLogos";

type Props = {
  shortName: string;
  website?: string | null;
  logoUrl?: string | null;
  size?: number;
  imageStyle?: ImageStyle;
  fallbackStyle?: ViewStyle;
  fallbackTextStyle?: TextStyle;
};

export function InstitutionLogo({
  shortName,
  website,
  logoUrl,
  size = 32,
  imageStyle,
  fallbackStyle,
  fallbackTextStyle,
}: Props) {
  const candidates = useMemo(
    () => institutionLogoCandidates(website, logoUrl),
    [website, logoUrl],
  );
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [candidates]);

  const uri = idx < candidates.length ? candidates[idx] : null;
  const radius = Math.round(size * 0.25);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.logo,
          { width: size, height: size, borderRadius: radius },
          imageStyle,
        ]}
        resizeMode="contain"
        onError={() => setIdx((i) => i + 1)}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius },
        fallbackStyle,
      ]}
    >
      <Text style={[styles.fallbackText, fallbackTextStyle]}>
        {shortName.slice(0, 3)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  fallback: {
    backgroundColor: Skoun.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    fontSize: 10,
    fontWeight: "700",
    color: Skoun.color.primary,
  },
});
