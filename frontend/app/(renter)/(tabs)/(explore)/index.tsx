import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  Pressable,
  useWindowDimensions,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ProductSwitchControl } from "@/components/campus/ProductSwitchControl";
import { InstitutionCampusPicker } from "@/components/auth/InstitutionCampusPicker";
import { SkounAuthModal } from "@/components/auth/SkounAuthModal";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { openCreateListing } from "@/features/auth/useEnsureSession";
import { useHostingNavState } from "@/features/listings/useHostingNavState";
import { api } from "@/lib/api";
import type { User } from "@/types/user";
import { Skoun } from "@/constants/theme";
import { LText } from "@/components/lister/Typography";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { CAMPUS_CATALOG } from "@/constants/campusCatalogStats";
import { browseSearchParams } from "@/lib/browseSearchUrl";
import { resolveCampusFromTypedQuery } from "@/lib/resolveCampusSearch";
import { useUniversities } from "@/features/universities/useUniversities";
import {
  AREA_REGIONS,
  DEMO_LISTINGS,
  DIRECTORY_AREAS,
  DIRECTORY_UNIS,
  HERO,
  POPULAR_SEARCHES,
  PROMO_CARDS,
  RAIL_PILLS,
  STEPS,
  TESTIMONIALS,
  VALUE_PROPS,
  type DemoListing,
} from "@/components/web/home/homeData";

/** NativeTabs + groups: `/search` is unmatched at root (hits +not-found). */
const SEARCH_PATH = "/(renter)/(tabs)/(explore)/search" as const;

function pushSearch(params?: {
  q?: string;
  campusId?: string;
  areas?: string[];
  universitySlugs?: string[];
}) {
  router.push({
    pathname: SEARCH_PATH,
    params: browseSearchParams(params ?? {}),
  } as never);
}

export default function RenterNewHomeScreen() {
  const { user, isSignedIn, isLoading: authLoading, refreshUser } =
    useAuthSession();
  const campusLabel = user?.campus
    ? user.campus.displayName ||
      `${user.campus.institutionShortName ?? ""} — ${user.campus.name}`.replace(
        /^ — /,
        "",
      )
    : null;
  const { width } = useWindowDimensions();
  const [regionId, setRegionId] = useState(AREA_REGIONS[0].id);
  const [railPill, setRailPill] = useState<string>(RAIL_PILLS[0]);
  const [dirTab, setDirTab] = useState<"areas" | "unis">("areas");
  const [searchQuery, setSearchQuery] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [campusPromptDismissed, setCampusPromptDismissed] = useState(false);
  const [campusSaving, setCampusSaving] = useState(false);
  const universities = useUniversities();

  const currentRegion = useMemo(
    () => AREA_REGIONS.find((r) => r.id === regionId) ?? AREA_REGIONS[0],
    [regionId]
  );

  const railListings = useMemo(() => {
    const match = DEMO_LISTINGS.filter((l) => l.area === railPill);
    const rest = DEMO_LISTINGS.filter((l) => l.area !== railPill);
    return [...match, ...rest].slice(0, 6);
  }, [railPill]);

  const handleSearchQuick = (query: string, kind: "q" | "area" = "q") => {
    if (kind === "area") pushSearch({ areas: [query] });
    else pushSearch({ q: query });
  };

  const { showSwitchToHosting } = useHostingNavState();

  const handleBecomeAHost = () => {
    if (!isSignedIn) {
      setAuthModalOpen(true);
      return;
    }
    openCreateListing(router);
  };

  const handleSwitchToHosting = () => {
    if (!isSignedIn) {
      setAuthModalOpen(true);
      return;
    }
    router.push("/(poster)/(tabs)" as never);
  };

  /** Always keep header CTA slot filled (old List Property). Label follows desktop host logic. */
  const hostCtaLabel = showSwitchToHosting
    ? "Switch to hosting"
    : "Become a host";
  const handleHostCta = showSwitchToHosting
    ? handleSwitchToHosting
    : handleBecomeAHost;

  const fitTileWidth = (width - 40 - 12) / 2; // two column with padding 20 and gap 12

  // Styled icons for our Governorates selector (to match Amber's circular flags)
  const GOVERNORATES = [
    {
      id: "beirut",
      shortLabel: "BEY",
      label: "Beirut",
      icon: "location",
      bgColor: Skoun.color.primaryMist,
      color: Skoun.color.primary,
    },
    {
      id: "coast",
      shortLabel: "MTL",
      label: "Coast & hills",
      icon: "leaf",
      bgColor: "#EBF5FF",
      color: "#1E429F",
    },
    {
      id: "cities",
      shortLabel: "CTY",
      label: "Cities",
      icon: "business",
      bgColor: "#E7F8F3",
      color: "#128C7E",
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION WITH IMAGE BACKGROUND */}
        <View style={styles.hero}>
          <Image
            source={{ uri: HERO.heroImage }}
            style={styles.heroImg}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(18,24,38,0.2)", "rgba(18,24,38,0.85)"]}
            style={styles.heroOverlay}
          />
          
          <View style={styles.heroTopContent}>
            {/* Top header navigation spacer */}
            <View style={styles.headerSpacer} />
            
            {/* Logo and Listing Trigger */}
            <View style={styles.brandRow}>
              <Text style={styles.brandText}>skoun</Text>
              <View style={styles.brandActions}>
                <ProductSwitchControl
                  variant="toCampus"
                  style={styles.listBtn}
                  textStyle={styles.listBtnText}
                />
                <Pressable
                  onPress={handleHostCta}
                  style={styles.listBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.listBtnText}>{hostCtaLabel}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <SearchAutocomplete
                variant="pill"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={
                  campusLabel
                    ? `Near ${campusLabel}`
                    : "Search area, university, listing…"
                }
                onSelectArea={(s) => pushSearch({ areas: [s.label] })}
                onSelectUniversity={(s) =>
                  pushSearch({
                    campusId: s.campusId,
                    universitySlugs: [s.slug],
                  })
                }
                onSelectListing={(s) => {
                  router.push(`/(renter)/listing/${s.id}` as never);
                }}
                onSubmitText={(q) => {
                  const campus = resolveCampusFromTypedQuery(
                    q,
                    universities.data ?? [],
                  );
                  if (campus) {
                    pushSearch({
                      campusId: campus.id,
                      universitySlugs: [campus.slug],
                    });
                    return;
                  }
                  pushSearch({ q });
                }}
                onClear={() => setSearchQuery("")}
              />
            </View>

            {/* Hero Main Copy Block */}
            <View style={styles.heroTextColumn}>
              <Text style={styles.heroTitleText}>
                Save Big on Student Accommodation
              </Text>
              <Text style={styles.heroSubtitleText}>
                {campusLabel
                  ? `Find a place near ${campusLabel}`
                  : "Best student accommodations near top Lebanese universities & neighborhoods"}
              </Text>
              <View style={styles.lowestPriceBadge}>
                <Ionicons name="pricetag" size={14} color="#ffffff" />
                <Text style={styles.lowestPriceText}>Lowest Price</Text>
              </View>
            </View>
          </View>
        </View>

        {/* COMPACT STATS ROW (No large card box shadows, pure minimalist columns like Amber) */}
        <View style={styles.compactStatsBand}>
          <View style={styles.statColumn}>
            <Ionicons name="school-outline" size={24} color={Skoun.color.primary} />
            <Text style={styles.statColValue}>{CAMPUS_CATALOG.universities}</Text>
            <Text style={styles.statColLabel}>Universities</Text>
          </View>
          
          <View style={styles.statColumn}>
            <Ionicons name="location-outline" size={24} color={Skoun.color.primary} />
            <Text style={styles.statColValue}>{CAMPUS_CATALOG.campuses}</Text>
            <Text style={styles.statColLabel}>Campuses</Text>
          </View>
          
          <View style={styles.statColumn}>
            <Ionicons name="map-outline" size={24} color={Skoun.color.primary} />
            <Text style={styles.statColValue}>{CAMPUS_CATALOG.areas}</Text>
            <Text style={styles.statColLabel}>Areas</Text>
          </View>
          
          <View style={styles.statColumn}>
            <Ionicons name="star-outline" size={24} color={Skoun.color.primary} />
            <Text style={styles.statColValue}>4.9/5</Text>
            <Text style={styles.statColLabel}>Trust Score</Text>
          </View>
        </View>

        {/* POPULAR AREAS WITH ROUNDED FLAG SELECTORS (GOVERNORATES) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LText variant="title" style={styles.sectionTitle}>
              Popular neighborhoods
            </LText>
            <LText variant="body" tone="muted" style={styles.sectionSub}>
              Browse student housing near {CAMPUS_CATALOG.campuses} campuses
              {" "}at {CAMPUS_CATALOG.universities} universities, in{" "}
              {CAMPUS_CATALOG.areas} areas.
            </LText>
          </View>

          {/* Governorates rounded row selectors (Matches Amber's flag selectors) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.govScrollContent}
            style={styles.govOuterScroll}
          >
            {GOVERNORATES.map((gov) => {
              const active = gov.id === regionId;
              return (
                <Pressable
                  key={gov.id}
                  onPress={() => setRegionId(gov.id)}
                  style={styles.govItemContainer}
                >
                  <View
                    style={[
                      styles.govCircle,
                      { backgroundColor: gov.bgColor },
                      active && styles.govCircleActive,
                    ]}
                  >
                    <Ionicons name={gov.icon as any} size={22} color={gov.color} />
                  </View>
                  <Text style={[styles.govLabelText, active && styles.govLabelTextActive]}>
                    {gov.shortLabel}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Grid of city tiles (2 columns wrapper) */}
          <View style={styles.cityGrid}>
            {currentRegion.areas.slice(0, 6).map((area) => (
              <Pressable
                key={area.name}
                onPress={() => handleSearchQuick(area.name, "area")}
                style={[styles.cityCard, { width: fitTileWidth, height: fitTileWidth * 1.15 }]}
              >
                <Image source={{ uri: area.image }} style={styles.cityImg} />
                <LinearGradient
                  colors={["transparent", "rgba(18,24,38,0.75)"]}
                  style={styles.cityOverlay}
                />
                <Text style={styles.cityName}>{area.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* DEMO LISTINGS RAIL */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LText variant="title" style={styles.sectionTitle}>
              Featured listings
            </LText>
            <LText variant="body" tone="muted" style={styles.sectionSub}>
              Verified rooms and apartments in Lebanon
            </LText>
          </View>

          {/* Area rail selection */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContainer}
            style={styles.pillsOuterScroll}
          >
            {RAIL_PILLS.map((p) => {
              const active = p === railPill;
              return (
                <Pressable
                  key={p}
                  onPress={() => setRailPill(p)}
                  style={[styles.regionPill, active && styles.regionPillActive]}
                >
                  <Text style={[styles.regionPillText, active && styles.regionPillTextActive]}>
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Horizontal scroll of listings */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listingsScrollContent}
          >
            {railListings.map((item) => (
              <Pressable
                key={item.id}
                style={styles.listingCard}
                onPress={() => handleSearchQuick(item.area, "area")}
              >
                <View style={styles.listingImgContainer}>
                  <Image source={{ uri: item.images[0] }} style={styles.listingImg} />
                  {item.tag ? (
                    <View style={styles.listingTag}>
                      <Text style={styles.listingTagText}>{item.tag}</Text>
                    </View>
                  ) : null}
                  <View style={styles.listingHeart}>
                    <Ionicons name="heart-outline" size={16} color="#fff" />
                  </View>
                </View>
                <View style={styles.listingBody}>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.listingArea}>
                    {item.area}, Lebanon
                  </Text>
                  
                  {/* Utilities tags row */}
                  <View style={styles.listingUtilRow}>
                    {item.utilities.slice(0, 3).map((u) => (
                      <View key={u} style={styles.listingUtilBadge}>
                        <Text style={styles.listingUtilBadgeText}>{u}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.listingPrice}>
                    From ${item.priceUsd}
                    <Text style={styles.listingPriceUnit}> / month</Text>
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* TRUST ACCORDIONS / SOCIAL PROOF BAND */}
        <View style={styles.trustBand}>
          <LText variant="subtitle" tone="ink" style={styles.trustTitle}>
            Trusted by Lebanon's renters
          </LText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.testimonialsScrollContent}
          >
            {TESTIMONIALS.map((t) => (
              <View key={t.id} style={styles.testimonialCard}>
                <View style={styles.starsRow}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Ionicons key={i} name="star" size={14} color="#00B67A" />
                  ))}
                </View>
                <Text style={styles.testimonialQuote}>“{t.quote}”</Text>
                <View style={styles.testimonialMeta}>
                  <Text style={styles.testimonialName}>{t.name}</Text>
                  <Text style={styles.testimonialPlace}> · {t.place}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* VALUE PROPS (BUILT FOR LEBANON) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LText variant="title" style={styles.sectionTitle}>
              Built for Lebanese realities
            </LText>
            <LText variant="body" tone="muted" style={styles.sectionSub}>
              Clear listings, honest utility statuses, direct WhatsApp chats.
            </LText>
          </View>

          <View style={styles.valuePropsStack}>
            {VALUE_PROPS.map((v) => (
              <View key={v.id} style={styles.valuePropItem}>
                <View style={styles.valuePropIconBox}>
                  <Ionicons name={v.icon} size={22} color={Skoun.color.primary} />
                </View>
                <View style={styles.valuePropCopy}>
                  <LText variant="subtitle" style={styles.valuePropTitle}>
                    {v.title}
                  </LText>
                  <LText variant="caption" tone="muted" style={styles.valuePropBody}>
                    {v.body}
                  </LText>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* PROMO CARDS (CALL TO ACTIONS) */}
        <View style={styles.promoSection}>
          <View style={styles.promoCardStack}>
            {PROMO_CARDS.map((p) => {
              const isWarm = p.tone === "warm";
              return (
                <Pressable
                  key={p.id}
                  style={[
                    styles.promoCard,
                    isWarm ? styles.promoWarm : styles.promoDeep,
                  ]}
                  onPress={() => {
                    if (p.action === "list") {
                      handleListPlace();
                    } else {
                      pushSearch();
                    }
                  }}
                >
                  <Text style={[styles.promoTitle, !isWarm && styles.promoTextInverse]}>
                    {p.title}
                  </Text>
                  <Text style={[styles.promoBody, !isWarm && styles.promoTextInverseMuted]}>
                    {p.body}
                  </Text>
                  <View style={[styles.promoBtn, !isWarm && styles.promoBtnInverse]}>
                    <Text style={[styles.promoBtnText, !isWarm && styles.promoBtnTextInverse]}>
                      {p.cta}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 3 STEPS VERTICAL TIMELINE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LText variant="title" style={styles.sectionTitle}>
              Get your home in 3 steps
            </LText>
          </View>

          <View style={styles.stepsStack}>
            {STEPS.map((s, idx) => (
              <View key={s.n} style={styles.stepItem}>
                <View style={styles.stepColLeft}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{s.n}</Text>
                  </View>
                  {idx < STEPS.length - 1 ? <View style={styles.stepTimelineLine} /> : null}
                </View>
                <View style={styles.stepColRight}>
                  <Text style={styles.stepTitleText}>{s.title}</Text>
                  <Text style={styles.stepBodyText}>{s.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* QUICK ACCESS DIRECTORY LINKS */}
        <View style={styles.section}>
          <View style={styles.directoryTabs}>
            <Pressable
              onPress={() => setDirTab("areas")}
              style={[styles.directoryTabBtn, dirTab === "areas" && styles.directoryTabBtnActive]}
            >
              <Text style={[styles.directoryTabBtnText, dirTab === "areas" && styles.directoryTabBtnTextActive]}>
                Neighborhoods
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setDirTab("unis")}
              style={[styles.directoryTabBtn, dirTab === "unis" && styles.directoryTabBtnActive]}
            >
              <Text style={[styles.directoryTabBtnText, dirTab === "unis" && styles.directoryTabBtnTextActive]}>
                Universities
              </Text>
            </Pressable>
          </View>

          <View style={styles.directoryLinksContainer}>
            {(dirTab === "areas" ? DIRECTORY_AREAS : DIRECTORY_UNIS).map((link) => (
              <Pressable
                key={link}
                onPress={() => handleSearchQuick(link)}
                style={styles.directoryLinkItem}
              >
                <Ionicons name="location-outline" size={14} color={Skoun.color.primary} />
                <Text style={styles.directoryLinkText}>{link}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* HELP & SUPPORT TILES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LText variant="title" style={styles.sectionTitle}>
              Connect with support
            </LText>
            <LText variant="body" tone="muted" style={styles.sectionSub}>
              We are here to assist your housing journey.
            </LText>
          </View>

          <View style={styles.helpTilesGrid}>
            <Pressable
              onPress={() => setAuthModalOpen(true)}
              style={styles.helpTile}
            >
              <View style={[styles.helpTileIconBox, { backgroundColor: "#E8EEF6" }]}>
                <Ionicons name="chatbubbles-outline" size={20} color={Skoun.color.primary} />
              </View>
              <Text style={styles.helpTileTitle}>Live Chat</Text>
              <Text style={styles.helpTileMeta}>In-app support</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                Linking.openURL(
                  "https://wa.me/?text=" +
                    encodeURIComponent("Hi Skoun — I have a question about housing.")
                )
              }
              style={styles.helpTile}
            >
              <View style={[styles.helpTileIconBox, { backgroundColor: "#E7F8F3" }]}>
                <Ionicons name="logo-whatsapp" size={20} color="#128C7E" />
              </View>
              <Text style={styles.helpTileTitle}>WhatsApp</Text>
              <Text style={styles.helpTileMeta}>Fast replies</Text>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL("mailto:hello@skoun.app")}
              style={styles.helpTile}
            >
              <View style={[styles.helpTileIconBox, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="mail-outline" size={20} color="#B45309" />
              </View>
              <Text style={styles.helpTileTitle}>Email Us</Text>
              <Text style={styles.helpTileMeta}>hello@skoun.app</Text>
            </Pressable>
          </View>
        </View>

        {/* CLEAN BRAND FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>skoun</Text>
          <Text style={styles.footerText}>
            Lebanon student rental classifieds. Matchmaking only — we don’t hold deposits or write leases.
          </Text>
          <Text style={styles.footerCopyright}>
            © {new Date().getFullYear()} Skoun. All rights reserved.
          </Text>
        </View>

      </ScrollView>

      <SkounAuthModal
        visible={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />

      {!authLoading &&
      isSignedIn &&
      !user?.campusId &&
      !campusPromptDismissed &&
      !authModalOpen ? (
        <Modal
          visible
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setCampusPromptDismissed(true)}
        >
          <SafeAreaView style={styles.campusModal}>
            <ScrollView
              contentContainerStyle={styles.campusModalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <InstitutionCampusPicker
                selectedCampusId={null}
                onSelectCampus={async (campus) => {
                  if (campusSaving) return;
                  setCampusSaving(true);
                  try {
                    await api.patch<{ data: User }>("/api/users/me/campus", {
                      campusId: campus.id,
                    });
                    await refreshUser();
                  } catch (err) {
                    console.error("Failed to save campus:", err);
                  } finally {
                    setCampusSaving(false);
                  }
                }}
              />
              <Pressable
                onPress={() => setCampusPromptDismissed(true)}
                disabled={campusSaving}
                style={styles.campusSkipBtn}
                accessibilityRole="button"
              >
                <Text style={styles.campusSkipText}>Skip for now</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  campusModal: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  campusModalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  campusSkipBtn: {
    marginTop: 24,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  campusSkipText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: Skoun.color.inkMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    paddingBottom: 32,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden",
    position: "relative",
  },
  heroImg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerSpacer: {
    height: Platform.OS === "ios" ? 48 : 20,
  },
  heroTopContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  brandActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandText: {
    fontFamily: Skoun.type.display,
    fontSize: 28,
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: -1,
  },
  listBtn: {
    backgroundColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  listBtnText: {
    fontFamily: Skoun.type.bodyMedium,
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  searchContainer: {
    zIndex: 50,
    overflow: "visible",
    marginBottom: 16,
  },
  searchFieldMock: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  searchHintBold: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: "#1F2A37",
    fontWeight: "700",
  },
  searchHintMuted: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: "#9CA3AF",
  },
  searchCircleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLowerGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    gap: 12,
  },
  heroTextColumn: {
    flex: 1.2,
    gap: 8,
  },
  heroTitleText: {
    fontFamily: Skoun.type.display,
    fontSize: 22,
    color: "#ffffff",
    fontWeight: "800",
    lineHeight: 26,
  },
  heroSubtitleText: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: "#ffffff",
    opacity: 0.9,
    lineHeight: 16,
  },
  lowestPriceBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  lowestPriceText: {
    fontFamily: Skoun.type.bodySemi,
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  studentFrame: {
    flex: 0.8,
    height: 120,
    borderRadius: 100,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  studentImg: {
    width: "100%",
    height: "100%",
  },
  compactStatsBand: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#ffffff",
  },
  statColumn: {
    alignItems: "center",
    gap: 4,
  },
  statColValue: {
    fontFamily: Skoun.type.displayMedium,
    fontSize: 15,
    fontWeight: "700",
    color: "#111928",
  },
  statColLabel: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    color: "#6B7280",
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 16,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Skoun.color.ink,
  },
  sectionSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  govOuterScroll: {
    marginHorizontal: -20,
  },
  govScrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingVertical: 4,
  },
  govItemContainer: {
    alignItems: "center",
    gap: 6,
  },
  govCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  govCircleActive: {
    borderWidth: 2,
    borderColor: Skoun.color.primary,
  },
  govLabelText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  govLabelTextActive: {
    color: Skoun.color.primary,
  },
  pillsOuterScroll: {
    marginHorizontal: -20,
  },
  pillsContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  regionPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#EEF1F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  regionPillActive: {
    backgroundColor: Skoun.color.ink,
    borderColor: Skoun.color.ink,
  },
  regionPillText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
  regionPillTextActive: {
    color: "#ffffff",
  },
  cityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  cityCard: {
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  cityImg: {
    width: "100%",
    height: "100%",
  },
  cityOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cityName: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  listingsScrollContent: {
    gap: 14,
    paddingRight: 20,
    paddingBottom: 4,
  },
  listingCard: {
    width: 220,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  listingImgContainer: {
    height: 130,
    width: "100%",
    position: "relative",
  },
  listingImg: {
    width: "100%",
    height: "100%",
  },
  listingTag: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: Skoun.color.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  listingTagText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 10,
    color: "#ffffff",
  },
  listingHeart: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(18,24,38,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  listingBody: {
    padding: 12,
    gap: 6,
  },
  listingTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
    fontWeight: "600",
  },
  listingArea: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkMuted,
  },
  listingUtilRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  listingUtilBadge: {
    backgroundColor: "#EEF1F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  listingUtilBadgeText: {
    fontFamily: Skoun.type.body,
    fontSize: 10,
    color: Skoun.color.inkMuted,
  },
  listingPrice: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 14,
    color: Skoun.color.primary,
    fontWeight: "700",
    marginTop: 4,
  },
  listingPriceUnit: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    color: Skoun.color.inkMuted,
    fontWeight: "400",
  },
  trustBand: {
    backgroundColor: "#E8EEF6",
    paddingVertical: 24,
    marginTop: 32,
    gap: 12,
  },
  trustTitle: {
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: "700",
  },
  testimonialsScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  testimonialCard: {
    width: 260,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    gap: 8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  testimonialQuote: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 18,
    color: Skoun.color.inkMuted,
    fontStyle: "italic",
  },
  testimonialMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  testimonialName: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    fontWeight: "600",
    color: Skoun.color.ink,
  },
  testimonialPlace: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    color: Skoun.color.inkFaint,
  },
  valuePropsStack: {
    gap: 16,
    marginTop: 8,
  },
  valuePropItem: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  valuePropIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Skoun.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },
  valuePropCopy: {
    flex: 1,
    gap: 2,
  },
  valuePropTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  valuePropBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  promoSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  promoCardStack: {
    gap: 14,
  },
  promoCard: {
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  promoWarm: {
    backgroundColor: "#FDF2F2",
    borderWidth: 1,
    borderColor: "#FBD5D5",
  },
  promoDeep: {
    backgroundColor: Skoun.color.ink,
  },
  promoTitle: {
    fontFamily: Skoun.type.displayMedium,
    fontSize: 18,
    fontWeight: "700",
    color: "#9B2C2C",
  },
  promoBody: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: "#771D1D",
  },
  promoTextInverse: {
    color: "#ffffff",
  },
  promoTextInverseMuted: {
    color: "#D1D5DB",
  },
  promoBtn: {
    alignSelf: "flex-start",
    backgroundColor: Skoun.color.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  promoBtnInverse: {
    backgroundColor: "#ffffff",
  },
  promoBtnText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "600",
  },
  promoBtnTextInverse: {
    color: Skoun.color.ink,
  },
  stepsStack: {
    gap: 0,
    marginTop: 8,
  },
  stepItem: {
    flexDirection: "row",
    gap: 14,
  },
  stepColLeft: {
    alignItems: "center",
    width: 24,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  stepBadgeText: {
    color: "#ffffff",
    fontFamily: Skoun.type.bodyBold,
    fontSize: 12,
    fontWeight: "700",
  },
  stepTimelineLine: {
    width: 2,
    backgroundColor: Skoun.color.primarySoft,
    flex: 1,
    marginVertical: 4,
  },
  stepColRight: {
    flex: 1,
    paddingBottom: 24,
    gap: 4,
  },
  stepTitleText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    fontWeight: "600",
    color: Skoun.color.ink,
  },
  stepBodyText: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.inkMuted,
  },
  directoryTabs: {
    flexDirection: "row",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 8,
  },
  directoryTabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  directoryTabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: Skoun.color.primary,
  },
  directoryTabBtnText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
  directoryTabBtnTextActive: {
    color: Skoun.color.primary,
    fontWeight: "600",
  },
  directoryLinksContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  directoryLinkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  directoryLinkText: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    color: Skoun.color.inkMuted,
  },
  helpTilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  helpTile: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  helpTileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  helpTileTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    fontWeight: "600",
    color: Skoun.color.ink,
  },
  helpTileMeta: {
    fontFamily: Skoun.type.body,
    fontSize: 10,
    color: Skoun.color.inkFaint,
  },
  footer: {
    backgroundColor: Skoun.color.ink,
    paddingHorizontal: 20,
    paddingVertical: 32,
    marginTop: 40,
    gap: 12,
  },
  footerLogo: {
    fontFamily: Skoun.type.display,
    fontSize: 22,
    color: "#ffffff",
  },
  footerText: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    lineHeight: 16,
    color: "#D1D5DB",
  },
  footerCopyright: {
    fontFamily: Skoun.type.body,
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 8,
  },
});
