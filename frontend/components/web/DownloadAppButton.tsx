import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Skoun } from "@/constants/theme";

/**
 * SMIL Path Morphing Icon:
 * Replicates Amber Student's exact single-element line-art morph loop natively using SVG
 * SMIL `<animate attributeName="d">` path morphing. The single path element's control points
 * morph smoothly between the Phone frame outline path and the Tray container path.
 */
function SmilMorphDownloadIcon({ color = Skoun.color.ink }: { color?: string }) {
  if (Platform.OS === "web") {
    const SVG = "svg" as any;
    const Path = "path" as any;
    const Animate = "animate" as any;
    const AnimateTransform = "animateTransform" as any;
    const G = "g" as any;

    // Phone frame path topology (standing phone outline)
    const dPhone =
      "M 7,3 L 17,3 C 19,3 20,4 20,6 L 20,18 C 20,20 19,21 17,21 L 7,21 C 5,21 4,20 4,18 L 4,6 C 4,4 5,3 7,3 Z";

    // Tray frame path topology (open top receiving tray container)
    const dTray =
      "M 4,11 L 4,11 C 4,11 4,11 4,11 L 4,15 C 4,18 5,19.5 8,19.5 L 16,19.5 C 19,19.5 20,18 20,15 L 20,11 C 20,11 20,11 20,11 Z";

    const animValues = `${dPhone}; ${dTray}; ${dTray}; ${dPhone}`;
    const animKeyTimes = "0; 0.35; 0.75; 1";

    return (
      <SVG
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        style={{ display: "block" }}
      >
        {/* Single path morphing continuously between Phone and Tray outline */}
        <Path
          d={dPhone}
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <Animate
            attributeName="d"
            values={animValues}
            keyTimes={animKeyTimes}
            dur="2.8s"
            repeatCount="indefinite"
          />
        </Path>

        {/* Download arrow dropping into the morphing frame */}
        <G>
          <Path
            d="M 12,4 L 12,12 M 8.5,8.5 L 12,12 L 15.5,8.5"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <AnimateTransform
            attributeName="transform"
            type="translate"
            values="0,-5; 0,-1; 0,2.5; 0,7; 0,-5"
            keyTimes="0; 0.35; 0.7; 0.85; 1"
            dur="2.8s"
            repeatCount="indefinite"
          />
          <Animate
            attributeName="opacity"
            values="0; 1; 1; 0; 0"
            keyTimes="0; 0.25; 0.7; 0.85; 1"
            dur="2.8s"
            repeatCount="indefinite"
          />
        </G>
      </SVG>
    );
  }
  return null;
}

export function DownloadAppButton() {
  const [isHovered, setIsHovered] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={({ pressed }) => [
          styles.btn,
          isHovered && styles.btnHover,
          pressed && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Download Skoun Mobile App"
      >
        <View style={styles.iconSlot}>
          <SmilMorphDownloadIcon
            color={isHovered ? Skoun.color.primary : Skoun.color.ink}
          />
        </View>
        <Text style={[styles.text, isHovered && styles.textHover]}>
          Download App
        </Text>
      </Pressable>

      {/* App Download Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Get the Skoun App</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalSub}>
              Scan the QR code or choose your store to download Skoun on iOS or Android.
            </Text>

            <View style={styles.qrContainer}>
              <View style={styles.qrPlaceholder}>
                <SmilMorphDownloadIcon color={Skoun.color.primary} />
                <Text style={styles.qrText}>Scan QR Code</Text>
              </View>
            </View>

            <View style={styles.badgesRow}>
              <View style={styles.storeBadge}>
                <Text style={styles.badgeLabel}>App Store</Text>
                <Text style={styles.badgeSub}>Download for iOS</Text>
              </View>
              <View style={styles.storeBadge}>
                <Text style={styles.badgeLabel}>Google Play</Text>
                <Text style={styles.badgeSub}>Download for Android</Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Skoun.radius.sm,
    backgroundColor: "transparent",
    cursor: "pointer" as unknown as "auto",
    transitionProperty: "background-color, transform, color",
    transitionDuration: "0.2s",
  },
  btnHover: {
    backgroundColor: Skoun.color.primaryMist,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  iconSlot: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 14,
    color: Skoun.color.ink,
    letterSpacing: -0.1,
  },
  textHover: {
    color: Skoun.color.primary,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    maxWidth: 420,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 20,
    color: Skoun.color.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    color: Skoun.color.inkMuted,
    fontWeight: "600",
  },
  modalSub: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.inkMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  qrContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  qrPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FAFAFA",
  },
  qrText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    color: Skoun.color.inkMuted,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 12,
  },
  storeBadge: {
    flex: 1,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  badgeLabel: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 14,
    color: Skoun.color.ink,
  },
  badgeSub: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    color: Skoun.color.inkMuted,
    marginTop: 2,
  },
});
