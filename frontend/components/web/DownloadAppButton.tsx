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
 * Continuous SVG Icon with CSS keyframe stroke animations simulating
 * an arrow dropping inside a phone frame continuously.
 */
function AnimatedDownloadIcon({ color = Skoun.color.ink }: { color?: string }) {
  if (Platform.OS === "web") {
    const SVG = "svg" as any;
    const Path = "path" as any;
    const Rect = "rect" as any;
    const Line = "line" as any;
    const Style = "style" as any;
    const G = "g" as any;

    return (
      <SVG
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        style={{ display: "block" }}
      >
        <Style>{`
          @keyframes skounDropArrow {
            0% {
              transform: translateY(-5px);
              opacity: 0;
            }
            22% {
              opacity: 1;
            }
            58% {
              transform: translateY(1.5px);
              opacity: 1;
            }
            80% {
              transform: translateY(4.5px);
              opacity: 0;
            }
            100% {
              transform: translateY(-5px);
              opacity: 0;
            }
          }

          @keyframes skounPulseTray {
            0%, 20% {
              opacity: 0.35;
              transform: scaleX(0.85);
            }
            55%, 75% {
              opacity: 1;
              transform: scaleX(1);
            }
            100% {
              opacity: 0.35;
              transform: scaleX(0.85);
            }
          }

          .skoun-arrow-group {
            animation: skounDropArrow 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: center;
          }

          .skoun-tray-line {
            animation: skounPulseTray 2.2s ease-in-out infinite;
            transform-origin: 12px 15.5px;
          }
        `}</Style>

        {/* Stationary Phone Chassis */}
        <Rect
          x="4.5"
          y="2.5"
          width="15"
          height="19"
          rx="3"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
        />

        {/* Home Notch Line */}
        <Line
          x1="10"
          y1="18.5"
          x2="14"
          y2="18.5"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Base Download Receiver Tray inside Phone screen */}
        <Line
          x1="8.5"
          y1="15.5"
          x2="15.5"
          y2="15.5"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          className="skoun-tray-line"
        />

        {/* Arrow dropping continuously inside phone screen */}
        <G className="skoun-arrow-group">
          <Line
            x1="12"
            y1="5.5"
            x2="12"
            y2="12"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <Path
            d="M9 10L12 13L15 10"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
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
          <AnimatedDownloadIcon
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
                <AnimatedDownloadIcon color={Skoun.color.primary} />
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
