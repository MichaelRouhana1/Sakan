import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Skoun } from "@/constants/theme";

type IconState = "phone" | "download";

/**
 * Animated SVG Phone Icon
 */
function PhoneSvg({ color = Skoun.color.ink }: { color?: string }) {
  if (Platform.OS === "web") {
    const SVG = "svg" as any;
    const Path = "path" as any;
    const Rect = "rect" as any;
    return (
      <SVG
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
        <Path d="M12 18h.01" />
      </SVG>
    );
  }
  return null;
}

/**
 * Animated SVG Download Arrow Icon
 */
function DownloadSvg({ color = Skoun.color.ink }: { color?: string }) {
  if (Platform.OS === "web") {
    const SVG = "svg" as any;
    const Path = "path" as any;
    return (
      <SVG
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <Path d="M7 10l5 5 5-5" />
        <Path d="M12 15V3" />
      </SVG>
    );
  }
  return null;
}

export function DownloadAppButton() {
  const [activeIcon, setActiveIcon] = useState<IconState>("phone");
  const [isHovered, setIsHovered] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIcon((prev) => (prev === "phone" ? "download" : "phone"));
    }, 2800);
    return () => clearInterval(interval);
  }, []);

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
          <View
            style={[
              styles.iconWrapper,
              activeIcon === "phone" ? styles.iconVisible : styles.iconHiddenPhone,
            ]}
          >
            <PhoneSvg color={isHovered ? Skoun.color.primary : Skoun.color.ink} />
          </View>
          <View
            style={[
              styles.iconWrapper,
              activeIcon === "download" ? styles.iconVisible : styles.iconHiddenDownload,
            ]}
          >
            <DownloadSvg color={isHovered ? Skoun.color.primary : Skoun.color.ink} />
          </View>
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
                <PhoneSvg color={Skoun.color.primary} />
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
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    transitionProperty: "opacity, transform",
    transitionDuration: "0.4s",
    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  iconVisible: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }],
  },
  iconHiddenPhone: {
    opacity: 0,
    transform: [{ translateY: -12 }, { scale: 0.8 }],
  },
  iconHiddenDownload: {
    opacity: 0,
    transform: [{ translateY: 12 }, { scale: 0.8 }],
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
