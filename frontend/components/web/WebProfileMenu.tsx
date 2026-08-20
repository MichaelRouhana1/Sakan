import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SkounAuthModal } from "@/components/auth/SkounAuthModal";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";

type Props = {
  /** User initial for letter avatar; omit for generic person icon */
  initial?: string;
  avatarBackgroundColor?: string;
  showLoginButton?: boolean;
};

export function WebProfileMenu({
  initial,
  avatarBackgroundColor = "#F1F5F9",
  showLoginButton = true,
}: Props) {
  const router = useRouter();
  const { isSignedIn, user, logout } = useAuthSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "Account"
    : "Account";

  const avatarInitial =
    initial ??
    (user?.firstName?.charAt(0)?.toUpperCase() ||
      user?.email?.charAt(0)?.toUpperCase() ||
      "S");

  const handleLoginClick = () => {
    setMenuOpen(false);
    setAuthModalOpen(true);
  };

  const handleProfileTriggerClick = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleLogoutClick = async () => {
    setMenuOpen(false);
    await logout();
  };

  const requireAuthOr = (action: () => void) => {
    setMenuOpen(false);
    if (isSignedIn) {
      action();
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <>
      <View style={styles.wrap}>
        {showLoginButton && !isSignedIn ? (
          <Pressable
            onPress={handleLoginClick}
            style={styles.loginBtn}
            accessibilityRole="button"
            accessibilityLabel="Login"
          >
            <Text style={styles.loginBtnText}>Login</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleProfileTriggerClick}
          style={({ pressed }) => [
            initial ? styles.avatarLetter : styles.avatarIcon,
            initial ? { backgroundColor: avatarBackgroundColor } : null,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="User profile menu"
        >
          {initial ? (
            <Text style={styles.avatarLetterText}>{avatarInitial}</Text>
          ) : (
            <Ionicons name="person-outline" size={18} color={Skoun.color.ink} />
          )}
        </Pressable>

        {menuOpen ? (
          <>
            <Pressable
              style={styles.backdrop}
              onPress={() => setMenuOpen(false)}
            />

            <View style={styles.dropdown}>
              {!isSignedIn ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.banner,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    setMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                >
                  <Text style={styles.bannerText}>Login to Continue</Text>
                </Pressable>
              ) : (
                <View style={styles.banner}>
                  <Text style={styles.bannerText} numberOfLines={1}>
                    {displayName}
                  </Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemHover,
                ]}
                onPress={() => requireAuthOr(() => router.push("/profile"))}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#334155"
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>Profile</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemHover,
                ]}
                onPress={() => requireAuthOr(() => router.push("/saved"))}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color="#334155"
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>Bookings</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemHover,
                ]}
                onPress={() => requireAuthOr(() => router.push("/saved"))}
              >
                <Ionicons
                  name="heart-outline"
                  size={20}
                  color="#334155"
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>Shortlist</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemHover,
                ]}
                onPress={() => setMenuOpen(false)}
              >
                <Ionicons
                  name="download-outline"
                  size={20}
                  color="#334155"
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>Download App</Text>
              </Pressable>

              {isSignedIn ? (
                <>
                  <View style={styles.menuDivider} />
                  <Pressable
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && styles.menuItemHover,
                    ]}
                    onPress={handleLogoutClick}
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={20}
                      color="#334155"
                      style={styles.menuIcon}
                    />
                    <Text style={styles.menuText}>Logout</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </>
        ) : null}
      </View>

      <SkounAuthModal
        visible={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loginBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Skoun.radius.sm,
    cursor: "pointer",
  },
  loginBtnText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 15,
    color: Skoun.color.ink,
  },
  avatarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  avatarLetter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  avatarLetterText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 16,
    color: Skoun.color.ink,
  },
  pressed: {
    opacity: 0.85,
  },
  backdrop: {
    position: "fixed" as unknown as "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100vw" as unknown as number,
    height: "100vh" as unknown as number,
    zIndex: 99,
  },
  dropdown: {
    position: "absolute",
    top: 48,
    right: 0,
    width: 230,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 8,
    paddingHorizontal: 6,
    zIndex: 100,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  banner: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  bannerText: {
    fontFamily: Skoun.type.bodyBold,
    fontStyle: "italic",
    fontSize: 15,
    color: "#2C3E50",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
    cursor: "pointer",
  },
  menuItemHover: {
    backgroundColor: "#F8FAFC",
  },
  menuIcon: {
    width: 22,
  },
  menuText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: "#334155",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 4,
  },
});
