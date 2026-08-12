import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { Skoun } from "@/constants/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { isSignedIn, user } = useUser();
  const { signOut, openSignIn } = useClerk();

  const [loginSheetOpen, setLoginSheetOpen] = useState(false);
  const [email, setEmail] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(350)).current;

  const handleOpenLogin = () => {
    if (openSignIn) {
      openSignIn();
      return;
    }
    setLoginSheetOpen(true);
    fadeAnim.setValue(0);
    slideAnim.setValue(350);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCloseLogin = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 350,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setLoginSheetOpen(false);
    });
  };

  const handleContinue = () => {
    if (!email.trim()) return;
    if (openSignIn) {
      openSignIn();
    }
    setLoginSheetOpen(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER SECTION */}
        <View style={styles.headerCard}>
          <View style={styles.avatarCircle}>
            {isSignedIn && user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={28} color="#94A3B8" />
            )}
          </View>
          <View style={styles.headerTextCol}>
            {isSignedIn ? (
              <>
                <Text style={styles.guestTitle}>
                  {user?.fullName || user?.firstName || "Signed in User"}
                </Text>
                <Text style={styles.guestSubtitle}>
                  {user?.primaryEmailAddress?.emailAddress ||
                    user?.primaryPhoneNumber?.phoneNumber ||
                    "Signed in with Clerk"}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.guestTitle}>Guest</Text>
                <Text style={styles.guestSubtitle}>
                  Kindly{" "}
                  <Text style={styles.loginLink} onPress={handleOpenLogin}>
                    login
                  </Text>{" "}
                  to see full details
                </Text>
              </>
            )}
          </View>
        </View>

        {/* MENU OPTIONS */}
        <View style={styles.menuList}>
          {/* Bookings */}
          <Pressable
            style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}
            onPress={() => {
              if (isSignedIn) {
                router.push("/saved");
              } else {
                handleOpenLogin();
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Bookings"
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIconBg}>
                <Ionicons name="calendar-outline" size={20} color={Skoun.color.ink} />
              </View>
              <Text style={styles.menuLabel}>Bookings</Text>
            </View>
            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </Pressable>

          {/* Terms & Conditions */}
          <Pressable
            style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}
            onPress={() => {
              // Navigation or modal for T&C
            }}
            accessibilityRole="button"
            accessibilityLabel="Terms and Conditions"
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIconBg}>
                <Ionicons name="document-text-outline" size={20} color={Skoun.color.ink} />
              </View>
              <Text style={styles.menuLabel}>Terms & Conditions</Text>
            </View>
            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </Pressable>

          {/* Privacy Policy */}
          <Pressable
            style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}
            onPress={() => {
              // Navigation or modal for Privacy Policy
            }}
            accessibilityRole="button"
            accessibilityLabel="Privacy Policy"
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIconBg}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Skoun.color.ink} />
              </View>
              <Text style={styles.menuLabel}>Privacy Policy</Text>
            </View>
            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </Pressable>

          {/* Logout Option (when signed in) */}
          {isSignedIn ? (
            <Pressable
              style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}
              onPress={() => signOut()}
              accessibilityRole="button"
              accessibilityLabel="Logout"
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: "#FEF2F2" }]}>
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.menuLabel, { color: "#EF4444" }]}>Logout</Text>
              </View>
              <View style={styles.chevronCircle}>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {/* SLIDING LOGIN BOTTOM SHEET */}
      <Modal
        visible={loginSheetOpen}
        animationType="none"
        transparent
        onRequestClose={handleCloseLogin}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseLogin} />
          </Animated.View>
          
          <Animated.View
            style={[
              styles.sheetContainer,
              {
                transform: [{ translateY: slideAnim }],
                paddingBottom: Math.max(insets.bottom, 24),
              },
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header Row */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Login to Skoun</Text>
              <Pressable
                onPress={handleCloseLogin}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close login sheet"
              >
                <Ionicons name="close" size={24} color={Skoun.color.ink} />
              </Pressable>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.emailInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Email Address"
                placeholderTextColor={Skoun.color.inkFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Continue Button */}
            <Pressable
              style={({ pressed }) => [
                styles.continueBtn,
                !email.trim() && styles.continueBtnDisabled,
                pressed && email.trim() && styles.pressed,
              ]}
              onPress={handleContinue}
              disabled={!email.trim()}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text
                style={[
                  styles.continueText,
                  !email.trim() && styles.continueTextDisabled,
                ]}
              >
                Continue
              </Text>
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or login with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Alt Login Outlined Buttons */}
            <View style={styles.socialButtonsGroup}>
              {/* Mobile */}
              <Pressable
                style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
                onPress={() => {
                  if (openSignIn) openSignIn();
                }}
                accessibilityRole="button"
                accessibilityLabel="Login with Mobile"
              >
                <Ionicons name="call" size={20} color={Skoun.color.ink} style={styles.socialIcon} />
                <Text style={styles.socialBtnText}>Mobile</Text>
              </Pressable>

              {/* Google */}
              <Pressable
                style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
                onPress={() => {
                  if (openSignIn) openSignIn();
                }}
                accessibilityRole="button"
                accessibilityLabel="Login with Google"
              >
                <Ionicons name="logo-google" size={20} color="#EA4335" style={styles.socialIcon} />
                <Text style={styles.socialBtnText}>Google</Text>
              </Pressable>

              {/* Apple */}
              <Pressable
                style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
                onPress={() => {
                  if (openSignIn) openSignIn();
                }}
                accessibilityRole="button"
                accessibilityLabel="Login with Apple"
              >
                <Ionicons name="logo-apple" size={20} color="#000000" style={styles.socialIcon} />
                <Text style={styles.socialBtnText}>Apple</Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 20,
  },

  // HEADER CARD
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  headerTextCol: {
    flex: 1,
    gap: 3,
  },
  guestTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 18,
    color: Skoun.color.ink,
  },
  guestSubtitle: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.inkMuted,
  },
  loginLink: {
    fontFamily: Skoun.type.bodyBold,
    color: Skoun.color.primary,
    textDecorationLine: "underline",
  },

  // MENU LIST
  menuList: {
    gap: 12,
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pressed: {
    opacity: 0.9,
    backgroundColor: "#F8FAFC",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 16,
    color: Skoun.color.ink,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  // MODAL SLIDING SHEET
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Skoun.color.overlay,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  sheetTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 20,
    color: Skoun.color.ink,
  },
  inputGroup: {
    marginTop: 4,
  },
  emailInput: {
    fontFamily: Skoun.type.body,
    fontSize: 15,
    color: Skoun.color.ink,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
  },
  continueBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnDisabled: {
    backgroundColor: "#E2E8F0",
  },
  continueText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  continueTextDisabled: {
    color: "#94A3B8",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 13,
    color: Skoun.color.inkMuted,
    paddingHorizontal: 12,
  },
  socialButtonsGroup: {
    gap: 10,
    marginBottom: 8,
  },
  socialBtn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  socialIcon: {
    marginRight: 2,
  },
  socialBtnText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: Skoun.color.ink,
  },
});
