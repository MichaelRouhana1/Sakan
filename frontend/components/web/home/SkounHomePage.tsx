import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useUser, useClerk } from "@clerk/expo";
import { DownloadAppButton } from "@/components/web/DownloadAppButton";
import { SkounLogo } from "@/components/common/SkounLogo";
import { SkounAuthModal } from "@/components/auth/SkounAuthModal";
import { Skoun } from "@/constants/theme";
import {
  AREA_REGIONS,
  DEMO_LISTINGS,
  DIRECTORY_AREAS,
  DIRECTORY_UNIS,
  HERO,
  POPULAR_SEARCHES,
  PROMO_CARDS,
  RAIL_PILLS,
  SEARCH_HINTS,
  STATS,
  STEPS,
  TESTIMONIALS,
  VALUE_PROPS,
  type DemoListing,
} from "./homeData";

const IS_WEB = Platform.OS === "web";
const PAD_X = 80;

/** Square tile edge so N columns + gaps fill `contentWidth` exactly. */
function fitCityTileSize(
  contentWidth: number,
  columnCount: number,
  gap: number,
): number {
  const cols = Math.max(1, columnCount);
  return Math.max(
    1,
    Math.floor((contentWidth - gap * (cols - 1)) / cols),
  );
}

const LISTING_CARD_GAP = 12;
const LISTING_CARD_IDEAL = 240;
/** Floor so 5–6 desktop cards still fit; narrower viewports scroll instead. */
const LISTING_CARD_MIN = 168;

function AreaCityCard({
  name,
  image,
  size,
  onPress,
  fillCell = false,
}: {
  name: string;
  image: string;
  size: number;
  onPress: () => void;
  /** Web grid: stretch to 1fr cell instead of fixed px (avoids clip). */
  fillCell?: boolean;
}) {
  return (
    <Pressable
      {...(IS_WEB ? ({ className: "sk-city-card" } as object) : {})}
      style={[
        styles.tile,
        fillCell
          ? { width: "100%" as unknown as number, height: size }
          : { width: size, height: size },
      ]}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={name}
    >
      <Image
        source={{ uri: image }}
        style={styles.tileImage}
        resizeMode="cover"
        accessibilityLabel={name}
      />
      {IS_WEB ? (
        <View
          {...({ className: "sk-city-card__overlay" } as object)}
          style={styles.tileOverlayHost}
          pointerEvents="none"
        />
      ) : (
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.6)"]}
          locations={[0.366, 1]}
          style={styles.tileOverlayHost}
          pointerEvents="none"
        />
      )}
      <Text
        {...(IS_WEB ? ({ className: "sk-city-card__text" } as object) : {})}
        style={styles.tileLabel}
        numberOfLines={2}
      >
        {name}
      </Text>
    </Pressable>
  );
}

function goBrowse() {
  router.push("/search" as never);
}
function goList() {
  router.push("/(auth)/role-select" as never);
}
function goAuth() {
  router.push("/(auth)/phone" as never);
}

function SectionHeader({
  title,
  subtitle,
  rowEnd,
}: {
  title: string;
  subtitle?: string;
  rowEnd?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeadRow}>
      <View style={styles.sectionHeadText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
      {rowEnd}
    </View>
  );
}

function HomeNav({ solid }: { solid: boolean }) {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleLoginClick = () => {
    setMenuOpen(false);
    setAuthModalOpen(true);
  };

  const handleProfileClick = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleLogoutClick = async () => {
    setMenuOpen(false);
    await signOut();
  };

  return (
    <View style={[styles.nav, solid && styles.navSolid]} accessibilityRole="header">
      <View style={styles.navInner}>
        <Pressable
          onPress={() => router.push("/" as never)}
          style={styles.navBrand}
          accessibilityRole="link"
          accessibilityLabel="Skoun home"
        >
          <SkounLogo size={32} />
          <Text style={[styles.navBrandText, solid && styles.navBrandTextSolid]}>
            Skoun
          </Text>
        </Pressable>

        <View style={styles.navRight}>
          <DownloadAppButton isDarkNav={!solid} />

          {!isSignedIn ? (
            <Pressable onPress={handleLoginClick} accessibilityRole="button" style={styles.homeLoginTextBtn}>
              <Text style={[styles.navLink, solid && styles.navLinkSolid, { fontFamily: Skoun.type.bodyBold }]}>
                Login
              </Text>
            </Pressable>
          ) : null}

          <View style={{ position: "relative" }}>
            <Pressable
              onPress={handleProfileClick}
              style={[styles.navLogin, solid && styles.navLoginSolid]}
              accessibilityRole="button"
            >
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} />
              ) : (
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={solid ? Skoun.color.ink : "#fff"}
                />
              )}
            </Pressable>

            {menuOpen ? (
              <>
                <Pressable
                  style={styles.homeBackdrop}
                  onPress={() => setMenuOpen(false)}
                />
                <View style={styles.homeDropdownMenu}>
                  {!isSignedIn ? (
                    <Pressable
                      style={styles.homeLoginBanner}
                      onPress={() => {
                        setMenuOpen(false);
                        setAuthModalOpen(true);
                      }}
                    >
                      <Text style={styles.homeLoginBannerText}>
                        Login to Continue
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={styles.homeMenuItem}
                    onPress={() => {
                      setMenuOpen(false);
                      if (isSignedIn) {
                        router.push("/profile" as never);
                      } else {
                        setAuthModalOpen(true);
                      }
                    }}
                  >
                    <Ionicons name="person-outline" size={18} color="#334155" />
                    <Text style={styles.homeMenuText}>Profile</Text>
                  </Pressable>

                  <Pressable
                    style={styles.homeMenuItem}
                    onPress={() => {
                      setMenuOpen(false);
                      if (isSignedIn) {
                        router.push("/saved" as never);
                      } else {
                        setAuthModalOpen(true);
                      }
                    }}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#334155" />
                    <Text style={styles.homeMenuText}>Bookings</Text>
                  </Pressable>

                  <Pressable
                    style={styles.homeMenuItem}
                    onPress={() => {
                      setMenuOpen(false);
                      if (isSignedIn) {
                        router.push("/saved" as never);
                      } else {
                        setAuthModalOpen(true);
                      }
                    }}
                  >
                    <Ionicons name="heart-outline" size={18} color="#334155" />
                    <Text style={styles.homeMenuText}>Shortlist</Text>
                  </Pressable>

                  <Pressable
                    style={styles.homeMenuItem}
                    onPress={() => setMenuOpen(false)}
                  >
                    <Ionicons name="download-outline" size={18} color="#334155" />
                    <Text style={styles.homeMenuText}>Download App</Text>
                  </Pressable>

                  <Pressable
                    style={styles.homeMenuItem}
                    onPress={() => {
                      setMenuOpen(false);
                      goList();
                    }}
                  >
                    <Ionicons name="list-outline" size={18} color="#334155" />
                    <Text style={styles.homeMenuText}>List with Us</Text>
                  </Pressable>

                  {isSignedIn ? (
                    <>
                      <View style={styles.homeMenuDivider} />
                      <Pressable
                        style={styles.homeMenuItem}
                        onPress={handleLogoutClick}
                      >
                        <Ionicons name="log-out-outline" size={18} color="#334155" />
                        <Text style={styles.homeMenuText}>Logout</Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>

      <SkounAuthModal
        visible={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </View>
  );
}

function SearchPill() {
  const [query, setQuery] = useState("");
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setHintIndex((i) => (i + 1) % SEARCH_HINTS.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.searchPill}>
      <View style={styles.searchField}>
        {!query ? (
          <View style={styles.searchHintRow} pointerEvents="none">
            <Text style={styles.searchHintStatic}>Search by </Text>
            <Text key={SEARCH_HINTS[hintIndex]} style={styles.searchHintCycle}>
              {SEARCH_HINTS[hintIndex]}
            </Text>
          </View>
        ) : null}
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={goBrowse}
          style={styles.searchInput}
          accessibilityLabel={HERO.searchPlaceholder}
          returnKeyType="search"
        />
      </View>
      <Pressable
        onPress={goBrowse}
        style={styles.searchCircle}
        accessibilityRole="button"
        accessibilityLabel="Search"
      >
        <Ionicons name="search" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

function ListingCard({
  item,
  width = LISTING_CARD_IDEAL,
}: {
  item: DemoListing;
  width?: number;
}) {
  const [slide, setSlide] = useState(0);
  const img = item.images[slide] ?? item.images[0];

  return (
    <Pressable
      style={[styles.card, { width }]}
      onPress={goBrowse}
      accessibilityRole="link"
      accessibilityLabel={`${item.title} in ${item.area}`}
    >
      <View style={styles.cardMedia}>
        <Image source={{ uri: img }} style={styles.cardImg} resizeMode="cover" />
        {item.tag ? (
          <View style={styles.cardTag}>
            <Text style={styles.cardTagText}>{item.tag}</Text>
          </View>
        ) : null}
        <Pressable style={styles.heart} onPress={goAuth} accessibilityLabel="Save">
          <Ionicons name="heart-outline" size={18} color="#fff" />
        </Pressable>
        {item.images.length > 1 ? (
          <View style={styles.dots}>
            {item.images.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => setSlide(i)}
                style={[styles.dot, i === slide && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardArea}>{item.area}, LB</Text>
        <View style={styles.utilRow}>
          {item.utilities.slice(0, 3).map((u) => (
            <View key={u} style={styles.utilChip}>
              <Text style={styles.utilChipText}>{u}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.cardPrice}>
          From ${item.priceUsd}
          <Text style={styles.cardPriceUnit}> / month</Text>
        </Text>
      </View>
    </Pressable>
  );
}

export function SkounHomePage() {
  const { width } = useWindowDimensions();
  const [navSolid, setNavSolid] = useState(false);
  const [regionId, setRegionId] = useState(AREA_REGIONS[0].id);
  const [railPill, setRailPill] = useState<string>(RAIL_PILLS[0]);
  const [dirTab, setDirTab] = useState<"areas" | "unis">("areas");

  const isNarrow = width < 900;
  const padX = isNarrow ? 16 : width < 1200 ? 40 : PAD_X;
  const cityGap = isNarrow ? 10 : 16;
  const innerW = Math.min(width, 1400) - padX * 2;

  const region = useMemo(
    () => AREA_REGIONS.find((r) => r.id === regionId) ?? AREA_REGIONS[0],
    [regionId],
  );

  /** 2-row column-flow → columns = ceil(n / 2); size so every column fits. */
  const cityCols = Math.max(1, Math.ceil(region.areas.length / 2));
  const tileSize = fitCityTileSize(innerW, cityCols, cityGap);

  const railListings = useMemo(() => {
    const match = DEMO_LISTINGS.filter((l) => l.area === railPill);
    const rest = DEMO_LISTINGS.filter((l) => l.area !== railPill);
    return [...match, ...rest].slice(0, 6);
  }, [railPill]);

  /** Fit all demo cards in one row when possible (same idea as city tiles). */
  const listingCount = railListings.length;
  const listingFitAll =
    listingCount > 0 &&
    listingCount * LISTING_CARD_MIN +
      (listingCount - 1) * LISTING_CARD_GAP <=
      innerW;
  const listingCardW = listingFitAll
    ? fitCityTileSize(innerW, listingCount, LISTING_CARD_GAP)
    : Math.min(
        LISTING_CARD_IDEAL,
        Math.max(LISTING_CARD_MIN, Math.floor(innerW * 0.72)),
      );

  return (
    <View style={styles.root}>
      <HomeNav solid={navSolid} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setNavSolid(e.nativeEvent.contentOffset.y > 280)}
        scrollEventThrottle={16}
      >
        {/* ─── 1. HERO ─── */}
        <View style={[styles.hero, isNarrow && styles.heroNarrow]}>
          <Image
            source={{ uri: HERO.heroImage }}
            style={styles.heroImg}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={[styles.heroContent, { paddingHorizontal: padX }]}>
            <Text style={[styles.heroTitle, isNarrow && styles.heroTitleSm]}>
              {HERO.title}
            </Text>
            <Text style={styles.heroSub}>{HERO.subtitle}</Text>

            <View style={styles.chipRow}>
              {HERO.chips.map((c) => (
                <View
                  key={c.id}
                  style={styles.chip}
                  {...({ className: "sk-chip-shine" } as object)}
                >
                  <Ionicons
                    name={c.icon}
                    size={15}
                    color={Skoun.color.primarySoft}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.chipText}>{c.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.heroSearchWrap}>
              <SearchPill />
            </View>

            <View style={styles.popularSearches}>
              <Text style={styles.popularLabel}>Top areas: </Text>
              {POPULAR_SEARCHES.map((s, i) => (
                <Pressable key={s} onPress={goBrowse}>
                  <Text style={styles.popularLink}>
                    {s}
                    {i < POPULAR_SEARCHES.length - 1 ? ", " : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* ─── 2. INSIGHTS (Amber: directly under hero) ─── */}
        <View style={[styles.statsBand, { paddingHorizontal: padX }]}>
          <View style={[styles.statsRow, isNarrow && styles.statsRowNarrow]}>
            {STATS.map((s) => (
              <View key={s.id} style={styles.statItem}>
                <Ionicons name={s.icon} size={32} color={Skoun.color.primary} />
                <View style={styles.statCopy}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statBody}>{s.body}</Text>
                </View>
              </View>
            ))}
            <View style={styles.statItem}>
              <Ionicons name="logo-whatsapp" size={32} color="#128C7E" />
              <View style={styles.statCopy}>
                <Text style={styles.statValue}>WhatsApp first</Text>
                <Text style={styles.statBody}>
                  Message posters directly — Skoun never holds deposits.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── 3. POPULAR AREAS (Amber 2-row city tile grid) ─── */}
        <View style={[styles.section, { paddingHorizontal: padX }]}>
          <SectionHeader
            title="Popular areas across Lebanon"
            subtitle="Browse rooms and apartments near campuses and neighborhoods that matter."
          />
          <View style={styles.countryTabs}>
            {AREA_REGIONS.map((r) => {
              const active = r.id === regionId;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setRegionId(r.id)}
                  style={[styles.countryTab, active && styles.countryTabActive]}
                >
                  <Text
                    style={[
                      styles.countryTabText,
                      active && styles.countryTabTextActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {IS_WEB ? (
            <View style={styles.citiesWrap}>
              <View
                {...({ className: "sk-cities-grid" } as object)}
                style={[
                  styles.citiesGrid,
                  {
                    display: "grid",
                    gridTemplateColumns: `repeat(${cityCols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(2, ${tileSize}px)`,
                    gridAutoFlow: "column",
                    gap: cityGap,
                    width: "100%",
                    overflow: "hidden",
                  } as object,
                ]}
              >
                {region.areas.map((a) => (
                  <AreaCityCard
                    key={a.name}
                    name={a.name}
                    image={a.image}
                    size={tileSize}
                    fillCell
                    onPress={goBrowse}
                  />
                ))}
              </View>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.tileRail, { gap: cityGap }]}
            >
              {region.areas.map((a) => (
                <AreaCityCard
                  key={a.name}
                  name={a.name}
                  image={a.image}
                  size={tileSize}
                  onPress={goBrowse}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ─── 4. LISTING RAIL ─── */}
        <View style={[styles.section, { paddingHorizontal: padX }]}>
          <SectionHeader
            title="Places across Lebanon"
            subtitle="Studios, private rooms, shared beds, and apartments — priced in USD / month."
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {RAIL_PILLS.map((p) => {
              const active = p === railPill;
              return (
                <Pressable
                  key={p}
                  onPress={() => setRailPill(p)}
                  style={[styles.railPill, active && styles.railPillActive]}
                >
                  <Text
                    style={[
                      styles.railPillText,
                      active && styles.railPillTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {listingFitAll ? (
            <View
              style={[
                styles.cardRailFit,
                { gap: LISTING_CARD_GAP, width: "100%" },
              ]}
            >
              {railListings.map((item) => (
                <ListingCard key={item.id} item={item} width={listingCardW} />
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.cardRail,
                { gap: LISTING_CARD_GAP, paddingRight: LISTING_CARD_GAP },
              ]}
            >
              {railListings.map((item) => (
                <ListingCard key={item.id} item={item} width={listingCardW} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ─── 5. SOCIAL PROOF (mint band — Amber TrustPilotBanner slot) ─── */}
        <View style={styles.trustBand}>
          <View
            style={[
              styles.section,
              { paddingHorizontal: padX, paddingVertical: 40, backgroundColor: "transparent" },
            ]}
          >
            <SectionHeader title="Trusted by renters & posters across Lebanon" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.testimonialRail}
            >
              {TESTIMONIALS.map((t) => (
                <View key={t.id} style={styles.testimonialCard}>
                  <View style={styles.stars}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Ionicons key={i} name="star" size={14} color="#00B67A" />
                    ))}
                  </View>
                  <Text style={styles.testimonialQuote}>“{t.quote}”</Text>
                  <Text style={styles.testimonialName}>{t.name}</Text>
                  <Text style={styles.testimonialPlace}>{t.place}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* ─── 6. VALUE PROPS ─── */}
        <View style={[styles.section, { paddingHorizontal: padX }]}>
          <SectionHeader
            title="Built for how Lebanon rents"
            subtitle="Clear listings, honest utilities, direct contact — no fake booking funnel."
          />
          <View style={[styles.valueGrid, isNarrow && styles.valueGridNarrow]}>
            {VALUE_PROPS.map((v) => (
              <View key={v.id} style={styles.valueCard}>
                <View style={styles.valueIcon}>
                  <Ionicons name={v.icon} size={26} color={Skoun.color.primary} />
                </View>
                <Text style={styles.valueTitle}>{v.title}</Text>
                <Text style={styles.valueBody}>{v.body}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── 7. PROMO CARDS ─── */}
        <View style={[styles.section, { paddingHorizontal: padX, paddingTop: 8 }]}>
          <SectionHeader
            title="Offers & next steps"
            subtitle="Whether you’re looking or listing — pick a path."
          />
          <View style={[styles.promoRow, isNarrow && styles.promoRowNarrow]}>
            {PROMO_CARDS.map((p) => (
              <Pressable
                key={p.id}
                style={[
                  styles.promoCard,
                  p.tone === "warm" && styles.promoWarm,
                  p.tone === "deep" && styles.promoDeep,
                ]}
                onPress={() => {
                  if (p.action === "list") goList();
                  else goBrowse();
                }}
              >
                <Text
                  style={[
                    styles.promoTitle,
                    p.tone === "deep" && styles.promoTitleOnDark,
                  ]}
                >
                  {p.title}
                </Text>
                <Text
                  style={[
                    styles.promoBody,
                    p.tone === "deep" && styles.promoBodyOnDark,
                  ]}
                >
                  {p.body}
                </Text>
                <View
                  style={[
                    styles.promoBtn,
                    p.tone === "deep" && styles.promoBtnOnDark,
                  ]}
                >
                  <Text
                    style={[
                      styles.promoBtnText,
                      p.tone === "deep" && styles.promoBtnTextOnDark,
                    ]}
                  >
                    {p.cta}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ─── 8. 3 STEPS ─── */}
        <View style={[styles.section, { paddingHorizontal: padX }]}>
          <SectionHeader
            title="Find your place in 3 easy steps"
            subtitle="Skoun connects renters and posters — leases stay between you."
          />
          <View style={[styles.steps, isNarrow && styles.stepsNarrow]}>
            {STEPS.map((s, i) => (
              <View key={s.n} style={styles.stepWrap}>
                <View style={styles.stepCard}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepN}>{s.n}</Text>
                  </View>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepBody}>{s.body}</Text>
                </View>
                {!isNarrow && i < STEPS.length - 1 ? (
                  <View style={styles.stepDash} />
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* ─── 9. LIST / PARTNER BANNERS ─── */}
        <View
          style={[
            styles.section,
            { paddingHorizontal: padX, flexDirection: isNarrow ? "column" : "row", gap: 16 },
          ]}
        >
          <Pressable style={styles.bannerCard} onPress={goList}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=70",
              }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            <View style={styles.bannerOverlay} />
            <Text style={styles.bannerTitle}>List with us</Text>
            <Text style={styles.bannerBody}>
              Post apartments, rooms, and dorms. Reach renters who message on WhatsApp.
            </Text>
            <View style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>List properties</Text>
            </View>
          </Pressable>
          <Pressable style={styles.bannerCard} onPress={goBrowse}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=70",
              }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            <View style={styles.bannerOverlay} />
            <Text style={styles.bannerTitle}>Browse near campus</Text>
            <Text style={styles.bannerBody}>
              University hub mode sorts by distance to AUB, LAU, USJ, and more.
            </Text>
            <View style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>Start browsing</Text>
            </View>
          </Pressable>
        </View>

        {/* ─── 10. DIRECTORY ─── */}
        <View style={[styles.section, { paddingHorizontal: padX }]}>
          <SectionHeader title="Neighborhoods & universities" />
          <View style={styles.dirTabs}>
            {(
              [
                ["areas", "Areas"],
                ["unis", "Universities"],
              ] as const
            ).map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => setDirTab(id)}
                style={[styles.dirTab, dirTab === id && styles.dirTabActive]}
              >
                <Text
                  style={[
                    styles.dirTabText,
                    dirTab === id && styles.dirTabTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.dirLinks}>
            {(dirTab === "areas" ? DIRECTORY_AREAS : DIRECTORY_UNIS).map((name) => (
              <Pressable key={name} onPress={goBrowse} style={styles.dirLink}>
                <Text style={styles.dirLinkText}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ─── 11. HELP ─── */}
        <View style={[styles.section, { paddingHorizontal: padX }]}>
          <SectionHeader
            title="Need help? Let’s connect"
            subtitle="Questions about browsing or listing."
          />
          <View style={[styles.helpGrid, isNarrow && styles.helpGridNarrow]}>
            <Pressable onPress={goAuth} style={styles.helpCard}>
              <View style={[styles.helpIcon, { backgroundColor: "#E8EEF6" }]}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={24}
                  color={Skoun.color.primary}
                />
              </View>
              <Text style={styles.helpTitle}>Live chat</Text>
              <Text style={styles.helpMeta}>Sign in to continue</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Linking.openURL(
                  "https://wa.me/?text=" +
                    encodeURIComponent("Hi Skoun — I have a question about housing."),
                )
              }
              style={styles.helpCard}
            >
              <View style={[styles.helpIcon, { backgroundColor: "#E7F8F3" }]}>
                <Ionicons name="logo-whatsapp" size={24} color="#128C7E" />
              </View>
              <Text style={styles.helpTitle}>WhatsApp</Text>
              <Text style={styles.helpMeta}>Fastest reply</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL("mailto:hello@skoun.app")}
              style={styles.helpCard}
            >
              <View style={[styles.helpIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="mail-outline" size={24} color="#B45309" />
              </View>
              <Text style={styles.helpTitle}>Email us</Text>
              <Text style={styles.helpMeta}>hello@skoun.app</Text>
            </Pressable>
            <Pressable onPress={goList} style={styles.helpCard}>
              <View style={[styles.helpIcon, { backgroundColor: "#FEE4E2" }]}>
                <Ionicons name="home-outline" size={24} color={Skoun.color.danger} />
              </View>
              <Text style={styles.helpTitle}>List a place</Text>
              <Text style={styles.helpMeta}>For landlords & brokers</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── 12. FOOTER ─── */}
        <View style={styles.footer}>
          <View style={[styles.footerInner, { paddingHorizontal: padX }]}>
            <View style={[styles.footerGrid, isNarrow && styles.footerGridNarrow]}>
              <View style={styles.footerBrandCol}>
                <Text style={styles.footerBrand}>Skoun</Text>
                <Text style={styles.footerTag}>
                  Lebanon rental classifieds — find, save, connect on WhatsApp.
                </Text>
              </View>
              <View>
                <Text style={styles.footerHead}>Company</Text>
                <Pressable onPress={goBrowse}>
                  <Text style={styles.footerLink}>Find housing</Text>
                </Pressable>
                <Pressable onPress={goList}>
                  <Text style={styles.footerLink}>List a place</Text>
                </Pressable>
              </View>
              <View>
                <Text style={styles.footerHead}>Support</Text>
                <Pressable onPress={goAuth}>
                  <Text style={styles.footerLink}>Help</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL("mailto:hello@skoun.app")}>
                  <Text style={styles.footerLink}>Contact</Text>
                </Pressable>
              </View>
              <View>
                <Text style={styles.footerHead}>Account</Text>
                <Pressable onPress={goAuth}>
                  <Text style={styles.footerLink}>Sign in</Text>
                </Pressable>
                <Pressable onPress={goList}>
                  <Text style={styles.footerLink}>Get started</Text>
                </Pressable>
              </View>
            </View>
            <Text style={styles.footerCopy}>
              © {new Date().getFullYear()} Skoun. Matchmaking only — we don’t hold leases
              or deposits.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    ...(IS_WEB
      ? {
          height: "100vh" as unknown as number,
          minHeight: "100vh" as unknown as number,
        }
      : {}),
    backgroundColor: "#fff",
  },
  scroll: {
    flex: 1,
    width: "100%",
    ...(IS_WEB
      ? ({
          height: "100vh" as unknown as number,
          overflowY: "scroll",
        } as object)
      : {}),
  },
  scrollContent: { flexGrow: 1, width: "100%" },

  nav: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: "transparent",
  },
  navSolid: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderBottomWidth: 1,
    borderBottomColor: Skoun.color.border,
  },
  navInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 14,
    maxWidth: 1400,
    width: "100%",
    alignSelf: "center",
  },
  navBrand: { flexDirection: "row", alignItems: "center", gap: 5 },
  navBrandText: {
    fontFamily: Skoun.type.display,
    fontSize: 26,
    letterSpacing: -0.8,
    color: "#fff",
  },
  navBrandTextSolid: { color: Skoun.color.primary },
  navRight: { flexDirection: "row", alignItems: "center", gap: 18 },
  navLink: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 14,
    color: "rgba(255,255,255,0.92)",
  },
  navLinkSolid: { color: Skoun.color.inkMuted },
  navLogin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  navLoginSolid: { borderColor: Skoun.color.border },
  navCta: {
    backgroundColor: Skoun.color.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navCtaSolid: { backgroundColor: Skoun.color.primary },
  navCtaText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: "#fff",
  },

  hero: {
    height: 450,
    width: "100%",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: Skoun.color.primaryDeep,
    position: "relative",
  },
  heroNarrow: { height: 520 },
  heroImg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    // @ts-expect-error web object-position
    objectPosition: "right center",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  heroContent: {
    zIndex: 2,
    maxWidth: 880,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    gap: 16,
    paddingTop: 62,
  },
  heroTitle: {
    fontFamily: Skoun.type.display,
    fontSize: 56,
    letterSpacing: -1.4,
    color: "#fff",
    textAlign: "center",
    lineHeight: 62,
  },
  heroTitleSm: { fontSize: 32, lineHeight: 36 },
  heroSub: {
    fontFamily: Skoun.type.body,
    fontSize: 16,
    lineHeight: 24,
    color: "rgba(255,255,255,0.95)",
    textAlign: "center",
    maxWidth: 560,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginTop: 0,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    height: 32,
    overflow: "hidden",
    position: "relative",
  },
  chipText: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: "#fff",
  },
  heroSearchWrap: {
    width: "100%",
    maxWidth: 720,
    alignItems: "center",
    marginTop: 0,
  },

  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 90,
    paddingLeft: 22,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 56,
    maxWidth: 720,
    width: "100%",
  },
  searchField: { flex: 1, justifyContent: "center", minHeight: 40 },
  searchHintRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  searchHintStatic: {
    fontFamily: Skoun.type.body,
    fontSize: 18,
    color: "#4b5563",
  },
  searchHintCycle: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 18,
    color: "#4b5563",
  },
  searchInput: {
    fontFamily: Skoun.type.body,
    fontSize: 18,
    color: Skoun.color.ink,
    paddingVertical: 8,
    outlineStyle: "none" as never,
  },
  searchCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  popularSearches: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 45,
    marginTop: -4,
  },
  popularLabel: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  popularLink: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 13,
    color: "#fff",
    textDecorationLine: "underline",
  },

  section: {
    paddingVertical: 56,
    width: "100%",
    maxWidth: 1400,
    alignSelf: "center",
    gap: 28,
    backgroundColor: "#fff",
  },
  sectionHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  sectionHeadText: { flex: 1, gap: 10, maxWidth: 820 },
  sectionTitle: {
    fontFamily: Skoun.type.display,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.6,
    color: "#111928",
  },
  sectionSub: {
    fontFamily: Skoun.type.body,
    fontSize: 17,
    lineHeight: 26,
    color: "#4b5563",
  },

  countryTabs: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  countryTab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  countryTabActive: {
    backgroundColor: Skoun.color.primaryMist,
    borderColor: Skoun.color.primary,
  },
  countryTabText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 15,
    color: "#374151",
  },
  countryTabTextActive: {
    color: "#111928",
    fontFamily: Skoun.type.bodySemi,
  },

  citiesWrap: {
    position: "relative",
    marginTop: 4,
    width: "100%",
    overflow: "hidden",
  },
  citiesGrid: {
    paddingTop: 8,
    // No paddingRight — was clipping the last column.
  },
  tileRail: { gap: 16, paddingVertical: 4, flexDirection: "row" },
  tile: {
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: Skoun.color.bgWash,
    display: "flex",
  },
  tileImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%" as unknown as number,
    height: "100%" as unknown as number,
    zIndex: 0,
  },
  tileOverlayHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  tileLabel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%" as unknown as number,
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 8,
    textAlign: "center",
    fontFamily: Skoun.type.bodySemi,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
    color: "#ffffff",
    zIndex: 2,
  },

  statsBand: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 48,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    maxWidth: 1400,
    width: "100%",
    alignSelf: "center",
    gap: 24,
    flexWrap: "wrap",
  },
  statsRowNarrow: { flexDirection: "column", alignItems: "flex-start" },
  statItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    flex: 1,
    minWidth: 200,
    maxWidth: 320,
  },
  statCopy: { flex: 1, gap: 4 },
  statValue: {
    fontFamily: Skoun.type.displayMedium,
    fontSize: 18,
    color: "#111928",
  },
  statBody: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 19,
    color: "#4b5563",
  },

  pillRow: { gap: 8, paddingBottom: 4 },
  railPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: Skoun.color.bg,
  },
  railPillActive: { backgroundColor: Skoun.color.primaryDeep },
  railPillText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 14,
    color: Skoun.color.inkMuted,
  },
  railPillTextActive: { color: "#fff" },

  /** Non-scroll row: cards sized to fill section content width (balanced L/R). */
  cardRailFit: {
    flexDirection: "row",
    flexWrap: "nowrap",
    paddingVertical: 4,
    overflow: "hidden",
  },
  /** Scroll fallback for narrow viewports — end padding keeps last card clear. */
  cardRail: { flexDirection: "row", paddingVertical: 4 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden",
    flexShrink: 0,
  },
  cardMedia: { height: 148, position: "relative", backgroundColor: Skoun.color.bgWash },
  cardImg: { width: "100%", height: "100%" },
  cardTag: {
    position: "absolute",
    left: 8,
    top: 8,
    backgroundColor: "rgba(18,24,38,0.78)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardTagText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 11,
    color: "#fff",
  },
  heart: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  dotActive: { width: 16, backgroundColor: "#fff" },
  cardBody: { padding: 12, gap: 4 },
  cardTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
  },
  cardArea: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkMuted,
  },
  utilRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  utilChip: {
    backgroundColor: Skoun.color.primaryMist,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  utilChipText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 10,
    color: Skoun.color.primaryDeep,
  },
  cardPrice: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
    marginTop: 6,
  },
  cardPriceUnit: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkMuted,
  },

  trustBand: {
    width: "100%",
    // Amber TrustPilotBanner mint wash (Skoun social proof)
    backgroundColor: "#e9f9f2",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  testimonialRail: { gap: 14 },
  testimonialCard: {
    width: 300,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  stars: { flexDirection: "row", gap: 2 },
  testimonialQuote: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    lineHeight: 22,
    color: Skoun.color.ink,
    minHeight: 66,
  },
  testimonialName: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
    marginTop: 4,
  },
  testimonialPlace: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkMuted,
  },

  valueGrid: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  valueGridNarrow: { flexDirection: "column" },
  valueCard: {
    flexGrow: 1,
    flexBasis: 220,
    gap: 10,
    paddingVertical: 8,
  },
  valueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Skoun.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },
  valueTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 17,
    color: Skoun.color.ink,
  },
  valueBody: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    lineHeight: 22,
    color: Skoun.color.inkMuted,
  },

  promoRow: { flexDirection: "row", gap: 16 },
  promoRowNarrow: { flexDirection: "column" },
  promoCard: {
    flex: 1,
    borderRadius: 12,
    padding: 22,
    gap: 10,
    minHeight: 200,
    justifyContent: "space-between",
  },
  promoWarm: { backgroundColor: "#FEF3C7" },
  promoMist: { backgroundColor: Skoun.color.primaryMist },
  promoDeep: { backgroundColor: Skoun.color.primaryDeep },
  promoTitle: {
    fontFamily: Skoun.type.displayMedium,
    fontSize: 20,
    color: Skoun.color.primaryDeep,
  },
  promoTitleOnDark: { color: "#fff" },
  promoBody: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    lineHeight: 21,
    color: Skoun.color.inkMuted,
    flex: 1,
  },
  promoBodyOnDark: { color: "rgba(255,255,255,0.78)" },
  promoBtn: {
    alignSelf: "flex-start",
    backgroundColor: Skoun.color.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
  },
  promoBtnOnDark: { backgroundColor: "#fff" },
  promoBtnText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: "#fff",
  },
  promoBtnTextOnDark: { color: Skoun.color.primaryDeep },

  steps: { flexDirection: "row", alignItems: "stretch", gap: 0 },
  stepsNarrow: { flexDirection: "column", gap: 16 },
  stepWrap: { flex: 1, flexDirection: "row", alignItems: "center" },
  stepCard: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  stepCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Skoun.color.primaryMist,
    borderWidth: 2,
    borderColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepN: {
    fontFamily: Skoun.type.display,
    fontSize: 22,
    color: Skoun.color.primary,
  },
  stepTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 16,
    color: Skoun.color.ink,
    textAlign: "center",
  },
  stepBody: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 20,
    color: Skoun.color.inkMuted,
    textAlign: "center",
  },
  stepDash: {
    width: 40,
    borderTopWidth: 2,
    borderStyle: "dashed",
    borderColor: Skoun.color.border,
    marginTop: -40,
  },

  bannerCard: {
    flex: 1,
    minHeight: 220,
    borderRadius: 12,
    overflow: "hidden",
    padding: 28,
    justifyContent: "flex-end",
    gap: 8,
    position: "relative",
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18,24,38,0.55)",
  },
  bannerTitle: {
    fontFamily: Skoun.type.displayMedium,
    fontSize: 24,
    color: "#fff",
    zIndex: 1,
  },
  bannerBody: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.85)",
    zIndex: 1,
    maxWidth: 360,
  },
  bannerBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    zIndex: 1,
  },
  bannerBtnText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: Skoun.color.primaryDeep,
  },

  dirTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Skoun.color.border,
    gap: 4,
  },
  dirTab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  dirTabActive: { borderBottomColor: Skoun.color.primary },
  dirTabText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.inkMuted,
  },
  dirTabTextActive: { color: Skoun.color.primary },
  dirLinks: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dirLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Skoun.color.bg,
  },
  dirLinkText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 13,
    color: Skoun.color.ink,
  },

  helpGrid: { flexDirection: "row", gap: 14 },
  helpGridNarrow: { flexDirection: "column" },
  helpCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    padding: 18,
    gap: 8,
    alignItems: "flex-start",
  },
  helpIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  helpTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: Skoun.color.ink,
  },
  helpMeta: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },

  footer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: Skoun.color.border,
    paddingTop: 40,
    paddingBottom: 32,
  },
  footerInner: { maxWidth: 1400, width: "100%", alignSelf: "center" },
  footerGrid: { flexDirection: "row", gap: 40, marginBottom: 28 },
  footerGridNarrow: { flexDirection: "column", gap: 24 },
  footerBrandCol: { flex: 1.3, gap: 10, maxWidth: 320 },
  footerBrand: {
    fontFamily: Skoun.type.display,
    fontSize: 24,
    color: Skoun.color.primary,
  },
  footerTag: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    lineHeight: 21,
    color: Skoun.color.inkMuted,
  },
  footerHead: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    color: Skoun.color.ink,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  footerLink: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.inkMuted,
    marginBottom: 8,
  },
  footerCopy: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkFaint,
  },

  homeLoginTextBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: "center",
  },
  homeBackdrop: {
    position: "fixed" as unknown as "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100vw" as unknown as number,
    height: "100vh" as unknown as number,
    zIndex: 99,
  },
  homeDropdownMenu: {
    position: "absolute",
    top: 44,
    right: 0,
    width: 220,
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
  homeLoginBanner: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  homeLoginBannerText: {
    fontFamily: Skoun.type.bodyBold,
    fontStyle: "italic",
    fontSize: 15,
    color: "#2C3E50",
  },
  homeMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  homeMenuText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: "#334155",
  },
  homeMenuDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 4,
  },
});
