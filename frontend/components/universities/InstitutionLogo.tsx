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
import {
  institutionLogoSource,
  isCircularInstitutionSeal,
} from "@/lib/institutionLogoSources";
import { institutionLogoCandidates } from "@/lib/institutionLogos";

type Props = {
  shortName: string;
  slug?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  size?: number;
  imageStyle?: ImageStyle;
  fallbackStyle?: ViewStyle;
  fallbackTextStyle?: TextStyle;
};

export function InstitutionLogo({
  shortName,
  slug,
  website,
  logoUrl,
  size = 32,
  imageStyle,
  fallbackStyle,
  fallbackTextStyle,
}: Props) {
  const local = institutionLogoSource(slug);
  const candidates = useMemo(
    () => (local ? [] : institutionLogoCandidates(website, logoUrl)),
    [local, website, logoUrl],
  );
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [candidates]);

  const uri = idx < candidates.length ? candidates[idx] : null;
  const radius = size / 2;
  const fillCircle = isCircularInstitutionSeal(slug);
  const inner = fillCircle ? size : Math.round(size * 0.72);
  const frameStyle = [
    styles.frame,
    { width: size, height: size, borderRadius: radius },
    fallbackStyle,
  ];

  if (local) {
    return (
      <View style={frameStyle}>
        <Image
          source={local}
          style={[{ width: inner, height: inner }, imageStyle]}
          resizeMode={fillCircle ? "cover" : "contain"}
        />
      </View>
    );
  }

  if (uri) {
    return (
      <View style={frameStyle}>
        <Image
          source={{ uri }}
          style={[{ width: inner, height: inner }, imageStyle]}
          resizeMode="contain"
          onError={() => setIdx((i) => i + 1)}
        />
      </View>
    );
  }

  return (
    <View style={frameStyle}>
      <Text style={[styles.fallbackText, fallbackTextStyle]}>
        {shortName.slice(0, 3)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Skoun.color.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallbackText: {
    fontSize: 10,
    fontWeight: "700",
    color: Skoun.color.primary,
  },
});
