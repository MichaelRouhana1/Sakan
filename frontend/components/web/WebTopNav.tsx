import { useCallback, useEffect, useState } from "react";
import { Link, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ProductSwitchControl } from "@/components/campus/ProductSwitchControl";
import { DownloadAppButton } from "@/components/web/DownloadAppButton";
import { SkounLogo } from "@/components/common/SkounLogo";
import { SkounAuthModal } from "@/components/auth/SkounAuthModal";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { Skoun } from "@/constants/theme";
import { HOST_LISTINGS_PATH } from "@/constants/hostRoutes";
import {
  WEB_CONTENT_MAX,
  WEB_CONTENT_PAD_X,
  WEB_NAV_HEIGHT,
} from "@/constants/webLayout";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { openCreateListing } from "@/features/auth/useEnsureSession";
import { useHostingNavState } from "@/features/listings/useHostingNavState";
import { campusFilterLabel } from "@/features/universities/useInstitutions";
import { useUniversities } from "@/features/universities/useUniversities";
import {
  browseSearchSetParams,
  homeBrowseHref,
  parseCsvParam,
} from "@/lib/browseSearchUrl";
import { resolveCampusFromTypedQuery } from "@/lib/resolveCampusSearch";
import type {
  SearchAreaSuggestion,
  SearchUniversitySuggestion,
} from "@/features/search/types";

type Props = {
  showSearch?: boolean;
};

export function WebTopNav({ showSearch = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{
    q?: string;
    campusId?: string;
    areas?: string;
    universitySlugs?: string;
  }>();
  const onBrowse = pathname.includes("/search");
  const universities = useUniversities();
  const { isSignedIn, user, logout } = useAuthSession();
  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "Account"
    : "Account";

  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  useEffect(() => {
    if (!showSearch) return;
    const q = typeof params.q === "string" ? params.q.trim() : "";
    const areas = parseCsvParam(params.areas);
    const slugs = parseCsvParam(params.universitySlugs);
    const campusId =
      typeof params.campusId === "string" ? params.campusId.trim() : "";

    if (q) {
      setSearchVal(q);
      return;
    }
    if (areas.length > 0) {
      setSearchVal(areas[0]!);
      return;
    }
    if (campusId || slugs.length > 0) {
      const campus = campusId
        ? universities.data?.find((u) => u.id === campusId)
        : universities.data?.find((u) => u.slug === slugs[0]);
      if (campus) {
        setSearchVal(campus.displayName ?? campus.name);
      }
      return;
    }
    setSearchVal("");
  }, [
    showSearch,
    params.q,
    params.areas,
    params.campusId,
    params.universitySlugs,
    universities.data,
  ]);

  const writeBrowse = useCallback(
    (next: {
      q?: string | null;
      campusId?: string | null;
      areas?: string[];
      universitySlugs?: string[];
      label?: string;
    }) => {
      if (next.label != null) setSearchVal(next.label);
      else if (next.q) setSearchVal(next.q);
      else if (next.areas?.[0]) setSearchVal(next.areas[0]);
      else if (!next.campusId && !next.universitySlugs?.length && !next.q) {
        setSearchVal("");
      }

      if (onBrowse) {
        router.setParams(browseSearchSetParams(next) as never);
        return;
      }
      router.push(
        homeBrowseHref({
          q: next.q ?? undefined,
          campusId: next.campusId ?? undefined,
          areas: next.areas,
          universitySlugs: next.universitySlugs,
        }) as never,
      );
    },
    [onBrowse, router],
  );

  const onSelectArea = useCallback(
    (s: SearchAreaSuggestion) => {
      writeBrowse({
        label: s.label,
        areas: [s.label],
        campusId: null,
        universitySlugs: [],
        q: null,
      });
    },
    [writeBrowse],
  );

  const onSelectUniversity = useCallback(
    (s: SearchUniversitySuggestion) => {
      writeBrowse({
        label: s.label,
        campusId: s.campusId,
        universitySlugs: [s.slug],
        areas: [],
        q: null,
      });
    },
    [writeBrowse],
  );

  const onSubmitText = useCallback(
    (q: string) => {
      const campus = resolveCampusFromTypedQuery(
        q,
        universities.data ?? [],
      );
      if (campus) {
        writeBrowse({
          label: campusFilterLabel(campus),
          campusId: campus.id,
          universitySlugs: [campus.slug],
          areas: [],
          q: null,
        });
        return;
      }
      writeBrowse({
        label: q,
        q,
        campusId: null,
        universitySlugs: [],
        areas: [],
      });
    },
    [universities.data, writeBrowse],
  );

  const onClearSearch = useCallback(() => {
    setSearchVal("");
    if (onBrowse) {
      router.replace("/search" as never);
      return;
    }
  }, [onBrowse, router]);

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

  const { showBecomeAHost, showSwitchToHosting } = useHostingNavState();

  const handleBecomeAHostClick = () => {
    if (!isSignedIn) {
      setAuthModalOpen(true);
      return;
    }
    openCreateListing(router);
  };

  const handleSwitchToHostingClick = () => {
    if (!isSignedIn) {
      setAuthModalOpen(true);
      return;
    }
    router.push(HOST_LISTINGS_PATH as never);
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
            <SearchAutocomplete
              value={searchVal}
              onChangeText={setSearchVal}
              placeholder="Search by city, area, university, or listing"
              onSelectArea={onSelectArea}
              onSelectUniversity={onSelectUniversity}
              onSelectListing={(s) => {
                router.push(`/listing/${s.id}` as never);
              }}
              onSubmitText={onSubmitText}
              onClear={onClearSearch}
              containerStyle={styles.searchAutocomplete}
            />
          </View>
        ) : null}

        <View style={styles.links}>
          <ProductSwitchControl variant="toCampus" />
          <DownloadAppButton />

          {showBecomeAHost ? (
            <Pressable
              onPress={handleBecomeAHostClick}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.hostCta,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.hostCtaText}>Become a host</Text>
            </Pressable>
          ) : null}

          {showSwitchToHosting ? (
            <Pressable
              onPress={handleSwitchToHostingClick}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.hostCta,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.hostCtaText}>Switch to hosting</Text>
            </Pressable>
          ) : null}

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
                  ) : (
                    <View style={styles.loginToContinueBanner}>
                      <Text style={styles.loginToContinueText} numberOfLines={1}>
                        {displayName}
                      </Text>
                    </View>
                  )}

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
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
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
    zIndex: 200,
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    boxSizing: "border-box",
    overflow: "visible",
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
    zIndex: 50,
    overflow: "visible",
  },
  searchAutocomplete: {
    flex: 1,
    maxWidth: 520,
  },
  links: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: "auto",
    flexShrink: 0,
  },
  hostCta: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    cursor: "pointer",
  },
  hostCtaText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: Skoun.color.ink,
    textDecorationLine: "underline",
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
