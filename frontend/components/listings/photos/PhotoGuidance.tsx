import { useState } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { LText } from "@/components/lister/Typography";
// TODO(photography): replace these original bundled illustrations with licensed Skoun seed-listing photos.
const examples = [
  {
    label: "Good · Living room",
    alt: "Illustration: bright living room with a window and sofa",
    drawing:
      '<rect width="200" height="120" fill="#F1E9DC"/><path d="M0 88H200V120H0Z" fill="#CAB99E"/><path d="M20 12H78V67H20Z" fill="#A8D2E5"/><path d="M49 12V67M20 39H78" stroke="#FFF" stroke-width="5"/><rect x="80" y="57" width="99" height="42" rx="8" fill="#708C80"/><rect x="86" y="48" width="40" height="35" rx="6" fill="#8AA494"/><rect x="130" y="48" width="40" height="35" rx="6" fill="#8AA494"/><ellipse cx="108" cy="111" rx="68" ry="7" fill="#E5D9C3"/>',
  },
  {
    label: "Good · Kitchen",
    alt: "Illustration: well-lit kitchen showing the counter, sink and cupboards",
    drawing:
      '<rect width="200" height="120" fill="#F3EFE7"/><path d="M0 103H200V120H0Z" fill="#C5B9A5"/><rect x="12" y="16" width="60" height="38" fill="#D4DDD6"/><rect x="132" y="10" width="52" height="48" fill="#B2D8E8"/><path d="M157 10V58" stroke="white" stroke-width="4"/><rect x="10" y="74" width="180" height="31" fill="#BAC6BB"/><path d="M8 72H192M57 76V105M109 76V105M160 76V105" stroke="#748C7C" stroke-width="4"/><ellipse cx="153" cy="73" rx="21" ry="5" fill="#80939C"/><path d="M151 69V59Q164 49 164 64" fill="none" stroke="#7E8A8E" stroke-width="3"/>',
  },
  {
    label: "Good · Exterior",
    alt: "Illustration: building front in daylight showing its entrance and balconies",
    drawing:
      '<rect width="200" height="120" fill="#C8DFE9"/><rect y="102" width="200" height="18" fill="#B5BC9C"/><rect x="50" y="9" width="100" height="101" fill="#EADBC7"/><path d="M66 24H88V43H66ZM111 24H134V43H111ZM66 56H88V75H66ZM111 56H134V75H111Z" fill="#7C9FAA"/><path d="M60 46H93M105 46H141M60 78H93M105 78H141" stroke="#A99680" stroke-width="5"/><rect x="91" y="84" width="21" height="26" fill="#8F8171"/><circle cx="23" cy="72" r="23" fill="#8DA680"/><path d="M23 83V111" stroke="#8C7C68" stroke-width="6"/>',
  },
  {
    label: "Bad · Dark corner",
    alt: "Illustration: dark corner hides the room and its features",
    drawing:
      '<rect width="200" height="120" fill="#33383D"/><path d="M106 0V85L200 120V0Z" fill="#272C31"/><path d="M0 120L106 85L200 120Z" fill="#45474A"/><rect x="22" y="64" width="51" height="39" rx="7" fill="#40464A"/>',
  },
];
export function PhotoGuidance() {
  const [width, setWidth] = useState(600);
  return (
    <View
      style={{ gap: 10 }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {examples.map((example, i) => (
          <View
            key={example.label}
            style={{ width: width < 520 ? "48%" : "23.5%", gap: 4 }}
          >
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={example.alt}
              style={{
                aspectRatio: 5 / 3,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <SvgXml
                xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">${example.drawing}</svg>`}
                width="100%"
                height="100%"
              />
            </View>
            <LText
              variant="caption"
              style={{ color: i === 3 ? "#9D342B" : "#34664F" }}
            >
              {example.label}
            </LText>
          </View>
        ))}
      </View>
      <LText variant="caption" tone="muted">
        Daylight, every main room, building front. No selfies.
      </LText>
      <LText variant="caption" tone="muted">
        Add details the photo doesn’t show, like ‘Sofa bed sleeps 2’.
      </LText>
    </View>
  );
}
