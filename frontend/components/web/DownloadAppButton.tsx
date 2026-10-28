import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Studently } from "@/constants/theme";

const DARK_ICON_GIF =
  "https://prod-static-assets.amberstudent.com/images/App_Download_Black_Nav_bar.gif?w=80";
const LIGHT_ICON_GIF =
  "https://prod-static-assets.amberstudent.com/images/App_Download_White_Nav_bar_2.gif?w=80";

type Props = {
  /** Switch to white GIF icon when rendered inside dark/transparent navigation bars. Default: false */
  isDarkNav?: boolean;
};

export function DownloadAppButton({ isDarkNav = false }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const gifSrc = isDarkNav ? LIGHT_ICON_GIF : DARK_ICON_GIF;

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={({ pressed }) => [
          styles.btn,
          isHovered && (isDarkNav ? styles.btnHoverDarkNav : styles.btnHover),
          pressed && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Download Studently Mobile App"
      >
        <View style={styles.iconSlot}>
          {Platform.OS === "web" ? (
            // Standard <img> element with CSS hue filter to shift pink accent to Studently brand blue
            // line-art monochrome remains unaffected
            <img
              src={gifSrc}
              width={20}
              height={20}
              alt="Download App"
              style={{
                width: 20,
                height: 20,
                display: "block",
                filter: "hue-rotate(200deg) saturate(1.3)",
                objectFit: "contain",
              }}
            />
          ) : null}
        </View>

        <Text
          style={[
            styles.text,
            isDarkNav && styles.textDarkNav,
            isHovered && (isDarkNav ? styles.textHoverDarkNav : styles.textHover),
          ]}
        >
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
              <Text style={styles.modalTitle}>Get the Studently App</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalSub}>
              Scan the QR code or choose your store to download Studently on iOS or Android.
            </Text>

            <View style={styles.qrContainer}>
              <View style={styles.qrPlaceholder}>
                {Platform.OS === "web" ? (
                  <img
                    src={DARK_ICON_GIF}
                    width={32}
                    height={32}
                    alt=""
                    style={{
                      width: 32,
                      height: 32,
                      filter: "hue-rotate(200deg) saturate(1.3)",
                    }}
                  />
                ) : null}
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
    borderRadius: Studently.radius.sm,
    backgroundColor: "transparent",
    cursor: "pointer" as unknown as "auto",
    transitionProperty: "background-color, transform, color",
    transitionDuration: "0.2s",
  },
  btnHover: {
    backgroundColor: Studently.color.primaryMist,
  },
  btnHoverDarkNav: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
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
    fontFamily: Studently.type.bodyMedium,
    fontSize: 14,
    color: Studently.color.ink,
    letterSpacing: -0.1,
  },
  textDarkNav: {
    color: "#FFFFFF",
  },
  textHover: {
    color: Studently.color.primary,
  },
  textHoverDarkNav: {
    color: "#FFFFFF",
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
    boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 20,
    color: Studently.color.ink,
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
    color: Studently.color.inkMuted,
    fontWeight: "600",
  },
  modalSub: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    color: Studently.color.inkMuted,
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
    fontFamily: Studently.type.bodyMedium,
    fontSize: 12,
    color: Studently.color.inkMuted,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 12,
  },
  storeBadge: {
    flex: 1,
    backgroundColor: Studently.color.surface,
    borderWidth: 1,
    borderColor: Studently.color.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  badgeLabel: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 14,
    color: Studently.color.ink,
  },
  badgeSub: {
    fontFamily: Studently.type.body,
    fontSize: 11,
    color: Studently.color.inkMuted,
    marginTop: 2,
  },
});
