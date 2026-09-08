import { useEffect, useState } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { ListingDetailMobile } from "@/components/listings/detail/ListingDetailMobile";
import { ListingDetailWeb } from "@/components/web/ListingDetailWeb";
import { WebShell } from "@/components/web/WebShell";

const MOBILE_MAX = 900;

function readWebWidth(fallback: number) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.innerWidth || fallback;
  }
  return fallback;
}

function useListingViewportWidth() {
  const { width } = useWindowDimensions();
  const [inner, setInner] = useState(() => readWebWidth(width));

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const sync = () => setInner(window.innerWidth);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return Platform.OS === "web" ? inner || width : width;
}

type Props = {
  listingId: string;
  onClose?: () => void;
};

/** Desktop listing chrome above 900px; original carded mobile layout below. */
export function ListingDetailRoute({ listingId, onClose }: Props) {
  const width = useListingViewportWidth();

  if (width < MOBILE_MAX || onClose) {
    return (
      <View style={styles.mobile}>
        <ListingDetailMobile listingId={listingId} onClose={onClose} />
      </View>
    );
  }

  return (
    <WebShell showFooter={false}>
      <ListingDetailWeb listingId={listingId} />
    </WebShell>
  );
}

const styles = StyleSheet.create({
  mobile: {
    flex: 1,
    width: "100%",
    minHeight: "100vh" as unknown as number,
    backgroundColor: "#F9FAFB",
  },
});
