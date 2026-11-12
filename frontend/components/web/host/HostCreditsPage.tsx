import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react-native";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { HostCreditsAura } from "@/components/web/host/HostCreditsAura";
import {
  PopularBadge,
  PopularPackBeam,
  WhishPayButton,
} from "@/components/web/host/HostCreditsMetal";
import { Studently } from "@/constants/theme";
import { useWhishCheckout } from "@/features/credits/useWhishCheckout";
import { useCredits } from "@/features/credits/useCredits";
import { api } from "@/lib/api";
import { formatUsdFromCents } from "@/lib/format";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Pack = {
  id: string;
  title: string;
  description: string;
  kind: "post" | "promotion";
  postCredits: number;
  boostCredits: number;
  amountUsdCents: number | null;
  enabled: boolean;
  savingsPercent: number;
};
type Catalog = { version: string; packs: Pack[] };

const web = Platform.OS === "web";
const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

const PROMO_COPY: Record<string, { blurb: string; point: string }> = {
  promotion_12: {
    blurb: "A first Featured, or a short run of Bumps.",
    point: "Any eligible listing",
  },
  promotion_60: {
    blurb: "Best value if you promote more than once.",
    point: "Use across your listings",
  },
  promotion_150: {
    blurb: "For dorms and brokers with a larger inventory.",
    point: "Many listings",
  },
};

function promotionCopy(pack: Pack) {
  const known = PROMO_COPY[pack.id] ?? {
    blurb: pack.description,
    point: "Any eligible listing",
  };
  const points =
    pack.amountUsdCents == null
      ? ["Featured or Bump", "Credits stay in your wallet", known.point]
      : [`${pack.boostCredits} promotion credits`, "Featured or Bump", known.point];
  if (pack.savingsPercent > 0) {
    points[points.length - 1] = `Save ${pack.savingsPercent}% per credit`;
  }
  return { blurb: known.blurb, points };
}

function heroFor(pack: Pack) {
  if (pack.amountUsdCents == null) {
    return { value: String(pack.boostCredits), unit: "credits" };
  }
  return { value: formatUsdFromCents(pack.amountUsdCents), unit: null as string | null };
}

function payLabel(pack: Pack, paying: boolean) {
  if (paying) return "Opening Whish…";
  if (!pack.enabled || pack.amountUsdCents == null) return "Coming soon · prices TBD";
  return `Pay ${formatUsdFromCents(pack.amountUsdCents)} with Whish`;
}

export function HostCreditsPage() {
  const params = useLocalSearchParams<{ ref?: string; returnTo?: string }>();
  const router = useRouter();
  const requested = first(params.returnTo);
  const returnTo =
    requested && /^\/hosting\/listing\/[0-9a-f-]{36}\/(outcome|promote)$/i.test(requested)
      ? requested
      : undefined;
  const checkout = useWhishCheckout(first(params.ref), returnTo);
  const balance = useCredits();
  const catalog = useQuery({
    queryKey: ["credits", "catalog"],
    queryFn: async () => (await api.get<{ data: Catalog }>("/api/credits/catalog")).data.data,
  });
  const packs = catalog.data?.packs ?? [];

  function buy(packId: string) {
    if (!catalog.data) return;
    void checkout.buy(packId, catalog.data.version);
  }

  return (
    <View style={s.page}>
      <Text style={s.eyebrow}>YOUR HOST WALLET</Text>
      <Text style={s.title}>Credits, on your terms.</Text>
      <Text style={s.body}>
        Choose post credits or promotion credits. Pay securely with Whish; credits arrive after
        payment is verified.
      </Text>
      <View style={s.balance}>
        <Text style={s.heading}>{balance.data?.postCredits ?? "—"} post credits</Text>
        <Text style={s.heading}>{balance.data?.boostCredits ?? "—"} promotion credits</Text>
      </View>
      <Text style={s.body}>
        Top-ups are manual. Promotion auto-renew is optional and off by default; it uses your
        existing wallet only.
      </Text>
      {checkout.tx && (
        <View style={s.receipt}>
          <Text style={s.heading}>
            {checkout.tx.status === "approved"
              ? "Credits added"
              : checkout.tx.status === "pending"
                ? "Finish payment in Whish"
                : "Payment not completed"}
          </Text>
          <Text style={s.body}>Reference: {checkout.tx.referenceId}</Text>
          {checkout.tx.status === "approved" && returnTo && (
            <Pressable
              accessibilityRole="button"
              style={s.button}
              onPress={() => router.push(returnTo as never)}
            >
              <Text style={s.buttonText}>Return to your listing</Text>
            </Pressable>
          )}
        </View>
      )}
      {checkout.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {checkout.error}
        </Text>
      )}
      {catalog.isLoading && <ActivityIndicator color={Studently.color.primary} />}
      {catalog.isError && (
        <Pressable accessibilityRole="button" onPress={() => void catalog.refetch()}>
          <Text style={s.error}>Could not load prices. Tap to retry.</Text>
        </Pressable>
      )}
      <View style={s.group}>
        <Text style={s.heading}>Keep your listings live</Text>
        <View style={s.grid}>
          {packs
            .filter((pack) => pack.kind === "post")
            .map((pack) => (
              <View key={pack.id} style={s.card}>
                <Text style={s.heading}>{pack.title}</Text>
                <Text style={s.body}>{pack.description}</Text>
                <Text style={s.amount}>
                  {pack.postCredits}
                  <Text style={s.body}> post credits</Text>
                </Text>
                <Text style={s.price}>
                  {pack.amountUsdCents == null ? "Price TBD" : formatUsdFromCents(pack.amountUsdCents)}
                </Text>
                {pack.savingsPercent > 0 && (
                  <Text style={s.saving}>Save {pack.savingsPercent}% per post</Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  disabled={!pack.enabled || checkout.isStarting}
                  onPress={() => buy(pack.id)}
                  style={({ pressed }) => [
                    s.button,
                    (!pack.enabled || pressed || checkout.isStarting) && { opacity: 0.45 },
                  ]}
                >
                  <Text style={s.buttonText}>
                    {!pack.enabled
                      ? "Coming soon · prices TBD"
                      : checkout.pendingBundle === pack.id
                        ? "Opening Whish…"
                        : "Buy with Whish"}
                  </Text>
                </Pressable>
              </View>
            ))}
        </View>
      </View>
      <View style={s.group}>
        <Text style={s.heading}>Featured & Bump credits</Text>
        <PromotionPacks
          packs={packs.filter((pack) => pack.kind === "promotion")}
          busy={checkout.isStarting}
          pendingId={checkout.pendingBundle}
          onBuy={buy}
        />
      </View>
      <Text style={s.body}>
        Featured means shared top slots, subject to availability and renter filters. Bump lifts an
        eligible listing in normal results once a day. Neither guarantees enquiries.
      </Text>
    </View>
  );
}

function PromotionPacks({
  packs,
  busy,
  pendingId,
  onBuy,
}: {
  packs: Pack[];
  busy: boolean;
  pendingId: string | null;
  onBuy: (packId: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const popularIndex = packs.length >= 3 ? 1 : -1;
  return (
    <View style={[s.promoGrid, !web && s.promoGridNative]}>
      {packs.map((pack, index) => {
        const popular = index === popularIndex;
        const card = (
          <PromotionCard
            pack={pack}
            popular={popular}
            busy={busy}
            paying={busy && pendingId === pack.id}
            reduceMotion={reduceMotion}
            onBuy={() => onBuy(pack.id)}
          />
        );
        if (!popular) {
          return (
            <View key={pack.id} style={[s.packSlot, !web && s.packSlotNative]}>
              {card}
            </View>
          );
        }
        return (
          <PopularPackBeam key={pack.id} active={!reduceMotion}>
            {card}
          </PopularPackBeam>
        );
      })}
    </View>
  );
}

function PromotionCard({
  pack,
  popular,
  busy,
  paying,
  reduceMotion,
  onBuy,
}: {
  pack: Pack;
  popular: boolean;
  busy: boolean;
  paying: boolean;
  reduceMotion: boolean;
  onBuy: () => void;
}) {
  const copy = promotionCopy(pack);
  const hero = heroFor(pack);
  const unavailable = !pack.enabled;
  const locked = unavailable || busy;
  const label = payLabel(pack, paying);

  const button = popular ? (
    <WhishPayButton
      label={label}
      disabled={locked}
      onPress={onBuy}
      active={!reduceMotion}
      pulseWhileDisabled={unavailable}
    />
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: locked, busy: paying }}
      disabled={locked}
      onPress={onBuy}
      style={({ hovered: hot, pressed }) => [
        s.cta,
        !locked && hot && s.ctaHover,
        pressed && !locked && s.pressed,
        locked && busy && s.ctaBusy,
        unavailable && s.ctaUnavailable,
      ]}
    >
      <Text style={s.ctaText}>{label}</Text>
    </Pressable>
  );

  return (
    <Pressable
      accessibilityRole="none"
      style={({ hovered }) => [
        s.promoCard,
        popular && s.promoCardPopular,
        web && promoCardWeb,
        hovered && promoCardHoverWeb,
      ]}
    >
      {!popular ? <CardAura /> : null}
      <View style={s.cardBody}>
        <View style={s.badgeRow}>
          {popular ? <PopularBadge active={!reduceMotion} /> : null}
        </View>
        <Text style={s.planName}>{pack.title}</Text>
        <View style={s.priceRow}>
          <Text style={s.planPrice}>{hero.value}</Text>
          {hero.unit ? <Text style={s.priceUnit}>{hero.unit}</Text> : null}
        </View>
        <Text style={s.blurb}>{copy.blurb}</Text>
        {button}
        <Text style={s.featuresLabel}>Included</Text>
        <View style={s.points}>
          {copy.points.map((point) => (
            <View key={point} style={s.point}>
              <Check color={Studently.color.primary} size={14} strokeWidth={2.2} />
              <Text style={s.pointText}>{point}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function CardAura() {
  return (
    <View pointerEvents="none" style={s.aura}>
      <View style={[s.orb, web && orbWeb]}>{web ? null : <HostCreditsAura starter />}</View>
    </View>
  );
}

const promoCardWeb = {
  boxSizing: "border-box",
  cursor: "default",
  transitionProperty: "border-color, box-shadow",
  transitionDuration: "160ms",
} as object;

const promoCardHoverWeb = {
  borderColor: Studently.color.primary,
  boxShadow: "0 10px 28px rgba(18,24,38,0.08)",
} as object;

const orbWeb = {
  backgroundImage:
    "radial-gradient(circle at 50% 50%, rgba(47,111,237,0.14) 0%, rgba(47,111,237,0.05) 42%, rgba(47,111,237,0) 70%)",
} as object;

const ctaWeb = {
  cursor: "pointer",
  transitionProperty: "border-color, background-color",
  transitionDuration: "160ms",
} as object;

const s = StyleSheet.create({
  page: {
    padding: 28,
    paddingBottom: 100,
    gap: 22,
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
  },
  eyebrow: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    color: Studently.color.primary,
  },
  title: { fontFamily: "DMSans_700Bold", fontSize: 38, color: Studently.color.ink },
  body: { fontFamily: "DMSans_400Regular", color: "#526174", fontSize: 14, lineHeight: 22 },
  heading: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Studently.color.ink },
  balance: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 30,
    padding: 22,
    backgroundColor: Studently.color.primaryMist,
    borderRadius: 16,
  },
  group: { gap: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  card: {
    flex: 1,
    minWidth: 230,
    padding: 24,
    gap: 18,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDE3EC",
    borderRadius: 18,
  },
  amount: { fontFamily: "DMSans_700Bold", fontSize: 34, color: Studently.color.ink },
  price: { fontSize: 22, fontFamily: "DMSans_600SemiBold", color: Studently.color.ink },
  saving: { color: Studently.color.primary, fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  button: {
    backgroundColor: Studently.color.primary,
    padding: 15,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { fontFamily: "DMSans_600SemiBold", color: "#FFF", fontSize: 14 },
  receipt: { backgroundColor: Studently.color.primaryMist, borderRadius: 16, padding: 22, gap: 12 },
  error: { color: "#9D2525", fontSize: 14, padding: 12 },
  promoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    alignItems: "stretch",
    width: "100%",
  },
  promoGridNative: {
    flexDirection: "column",
  },
  packSlot: {
    flexGrow: 1,
    flexBasis: 280,
    maxWidth: 380,
    minWidth: 260,
    alignSelf: "stretch",
  },
  packSlotNative: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    flexBasis: "auto",
    flexGrow: 0,
  },
  promoCard: {
    flexGrow: 1,
    width: "100%",
    alignSelf: "stretch",
    padding: 24,
    paddingTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: Studently.color.surface,
    overflow: "hidden",
    position: "relative",
  },
  promoCardPopular: {
    overflow: "visible",
    backgroundColor: Studently.color.surfaceMuted,
  },
  aura: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    zIndex: 0,
  },
  orb: {
    position: "absolute",
    width: 220,
    height: 220,
    top: -90,
    left: -80,
    borderRadius: 110,
  },
  cardBody: {
    zIndex: 1,
    gap: 10,
  },
  badgeRow: {
    minHeight: 22,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  planName: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 18,
    color: Studently.color.ink,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    minHeight: 44,
  },
  planPrice: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    color: Studently.color.ink,
  },
  priceUnit: {
    fontFamily: Studently.type.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
    color: Studently.color.inkMuted,
  },
  blurb: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: Studently.color.inkMuted,
    minHeight: 40,
  },
  cta: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: Studently.color.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    ...(web ? (ctaWeb as object) : null),
  },
  ctaHover: {
    borderColor: Studently.color.primarySoft,
    backgroundColor: Studently.color.surfaceMuted,
  },
  ctaBusy: {
    opacity: 0.55,
  },
  ctaUnavailable: {
    ...(web ? ({ cursor: "default" } as object) : null),
  },
  ctaText: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 14,
    color: Studently.color.ink,
    textAlign: "center",
  },
  featuresLabel: {
    marginTop: 12,
    fontFamily: Studently.type.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: Studently.color.inkFaint,
  },
  points: { gap: 8 },
  point: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pointText: {
    fontFamily: Studently.type.body,
    fontSize: 14,
    color: Studently.color.inkMuted,
    flexShrink: 1,
  },
  pressed: { opacity: 0.92 },
});
