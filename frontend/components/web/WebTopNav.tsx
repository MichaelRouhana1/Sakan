import { useEffect, useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { clearSession, getSession, type Session } from "@/lib/session";

import { DownloadAppButton } from "@/components/web/DownloadAppButton";
import { SkounLogo } from "@/components/common/SkounLogo";
import { SkounAuthModal } from "@/components/auth/SkounAuthModal";
import { Skoun } from "@/constants/theme";
import {
  WEB_CONTENT_MAX,
  WEB_CONTENT_PAD_X,
  WEB_NAV_HEIGHT,
} from "@/constants/webLayout";

import { useClerk, useUser } from "@clerk/expo";

type Props = {
  showSearch?: boolean;
};

export function WebTopNav({ showSearch = false }: Props) {
  const router = useRouter();
  const { user } = useUser();
  const clerk = useClerk();
  const [session, setSessionState] = useState<Session | null>(null);

  useEffect(() => {
    getSession().then(setSessionState);
  }, [user]);

  const isSignedIn = !!session || !!user;

  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleLoginClick = () => {
    setMenuOpen(false);
    setAuthModalOpen(true);
  };

  const handleProfileTriggerClick = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleLogoutClick = async () => {
    setMenuOpen(false);
    try {
      if (clerk?.signOut) {
        await clerk.signOut();
      }
    } catch {
      // fallback
    }
    await clearSession();
    setSessionState(null);
  };


  return (
    <View style={styles.bar}>
      <View style={[styles.inner, showSearch && styles.innerSearch]}>
        <Link href="/" asChild>
          <Pressable
            onPress={() => router.push("/")}
            accessibilityRole="link"
            style={styles.brandHit}
          >
            <SkounLogo size={32} />
            <Text style={styles.brand}>Skoun</Text>
          </Pressable>
        </Link>

        {showSearch ? (
          <View style={styles.searchWrap}>
            <TextInput
              placeholder="Search by city, area, university, or listing"
              placeholderTextColor={Skoun.color.inkMuted}
              style={styles.searchInput}
              editable={false}
              onPressIn={() => router.push("/search")}
              accessibilityLabel="Search listings"
            />
            <View style={styles.searchBtn} accessibilityElementsHidden>
              <Text style={styles.searchBtnGlyph}>⌕</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.links}>
          <DownloadAppButton />

          {/* PROFILE & LOGIN HEADER CONTAINER */}
          <View style={styles.profileNavWrap}>
            {!isSignedIn ? (
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
                styles.profileAvatarTrigger,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="User profile menu"
            >
              <View style={styles.avatarFallback}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={Skoun.color.ink}
                />
              </View>
            </Pressable>

            {/* DESKTOP PROFILE DROPDOWN MENU */}
            {menuOpen ? (
              <>
                <Pressable
                  style={styles.backdropOverlay}
                  onPress={() => setMenuOpen(false)}
                />

                <View style={styles.dropdownMenu}>
                  {!isSignedIn ? (
                    /* LOGGED OUT STATE: "Login to Continue" BANNER */
                    <Pressable
                      style={({ pressed }) => [
                        styles.loginToContinueBanner,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => {
                        setMenuOpen(false);
                        setAuthModalOpen(true);
                      }}
                    >
                      <Text style={styles.loginToContinueText}>
                        Login to Continue
                      </Text>
                    </Pressable>
                  ) : null}

                  {/* Menu Items */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && styles.menuItemHover,
                    ]}
                    onPress={() => {
                      setMenuOpen(false);
                      if (isSignedIn) {
                        router.push("/profile");
                      } else {
                        setAuthModalOpen(true);
                      }
                    }}
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
                    onPress={() => {
                      setMenuOpen(false);
                      if (isSignedIn) {
                        router.push("/saved");
                      } else {
                        setAuthModalOpen(true);
                      }
                    }}
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
                    onPress={() => {
                      setMenuOpen(false);
                      if (isSignedIn) {
                        router.push("/saved");
                      } else {
                        setAuthModalOpen(true);
                      }
                    }}
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
                    onPress={() => {
                      setMenuOpen(false);
                    }}
                  >
                    <Ionicons
                      name="download-outline"
                      size={20}
                      color="#334155"
                      style={styles.menuIcon}
                    />
                    <Text style={styles.menuText}>Download App</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && styles.menuItemHover,
                    ]}
                    onPress={() => {
                      setMenuOpen(false);
                      router.push("/(poster)/(tabs)/create");
                    }}
                  >
                    <Ionicons
                      name="list-outline"
                      size={20}
                      color="#334155"
                      style={styles.menuIcon}
                    />
                    <Text style={styles.menuText}>List with Us</Text>
                  </Pressable>

                  {/* LOGOUT (WHEN SIGNED IN) */}
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
        </View>
      </View>

      {/* SKOUN CUSTOM AMBER-STYLE AUTH MODAL */}
      <SkounAuthModal
        visible={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          getSession().then(setSessionState);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "sticky" as unknown as "relative",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    maxWidth: "100%",
    height: WEB_NAV_HEIGHT,
    minHeight: WEB_NAV_HEIGHT,
    zIndex: 50,
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    boxSizing: "border-box",
  },
  inner: {
    maxWidth: WEB_CONTENT_MAX,
    width: "100%",
    minHeight: WEB_NAV_HEIGHT,
    marginHorizontal: "auto" as unknown as number,
    alignSelf: "center",
    paddingHorizontal: WEB_CONTENT_PAD_X,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    boxSizing: "border-box",
  },
  innerSearch: {
    justifyContent: "flex-start",
  },
  brandHit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingRight: 8,
  },
  brand: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 22,
    color: Skoun.color.primary,
    letterSpacing: -0.6,
  },
  searchWrap: {
    flex: 1,
    maxWidth: 520,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: 999,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.ink,
    paddingVertical: 8,
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnGlyph: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: Skoun.type.bodyBold,
  },
  links: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: "auto",
    flexShrink: 0,
  },

  // PROFILE & DROPDOWN STYLES
  profileNavWrap: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 4,
  },
  loginBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Skoun.radius.sm,
  },
  loginBtnText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 15,
    color: Skoun.color.ink,
  },
  profileAvatarTrigger: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  backdropOverlay: {
    position: "fixed" as unknown as "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100vw" as unknown as number,
    height: "100vh" as unknown as number,
    zIndex: 99,
  },
  dropdownMenu: {
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
  loginToContinueBanner: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  loginToContinueText: {
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
