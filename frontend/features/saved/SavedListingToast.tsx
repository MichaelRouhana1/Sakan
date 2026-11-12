import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Studently } from "@/constants/theme";
import type { Listing } from "@/types/listing";
import { savedKeys } from "./keys";
import {
  subscribeSavedToasts,
  type SavedToastEvent,
} from "./savedToast";
import { useToggleSaved } from "./useSavedListings";

const SIDE = 16;
const FUSE = "rgba(47, 111, 237, 1)";
const FUSE_STOPS = [
  "rgba(47, 111, 237, 0)",
  "rgba(47, 111, 237, 0.18)",
  "rgba(47, 111, 237, 0.5)",
  "rgba(47, 111, 237, 0.84)",
  FUSE,
  FUSE,
  "rgba(47, 111, 237, 0.84)",
  "rgba(47, 111, 237, 0.5)",
  "rgba(47, 111, 237, 0.18)",
  "rgba(47, 111, 237, 0)",
] as const;
const FUSE_AT = [0, 0.09, 0.18, 0.28, 0.38, 0.62, 0.72, 0.82, 0.91, 1] as const;

type ToastItem = {
  key: string;
  seq: number;
  listing: Listing;
  open: boolean;
};

function applyToastEvent(prev: ToastItem[], event: SavedToastEvent): ToastItem[] {
  if (event.kind === "clear") {
    return prev.map((toast) => {
      if (toast.listing.id !== event.listingId || !toast.open) return toast;
      if (event.seq != null && toast.seq !== event.seq) return toast;
      return { ...toast, open: false };
    });
  }
  return [
    ...prev.filter((toast) => toast.listing.id !== event.listing.id),
    {
      key: `${event.listing.id}:${event.seq}`,
      seq: event.seq,
      listing: event.listing,
      open: true,
    },
  ];
}

function NativeFavoriteToast({
  open,
  top,
  width,
  onUndo,
  onExited,
}: {
  open: boolean;
  top: number;
  width: number;
  onUndo: () => void;
  onExited: () => void;
}) {
  const translateY = useRef(new Animated.Value(-90)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const fuse = useRef(new Animated.Value(1)).current;
  const gone = useRef(false);

  const leave = () => {
    if (gone.current) return;
    gone.current = true;
    fuse.stopAnimation();
    Animated.timing(translateY, {
      toValue: -120,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onExited();
    });
  };

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const burn = Animated.timing(fuse, {
      toValue: 0,
      duration: 4000,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    burn.start(({ finished }) => {
      if (finished) leave();
    });
    return () => burn.stop();
  }, [fuse, translateY]);

  useEffect(() => {
    if (!open) leave();
  }, [open]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy < -4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        drag.setValue(gesture.dy < 0 ? gesture.dy : gesture.dy * 0.2);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -36 || gesture.vy < -0.7) {
          leave();
          return;
        }
        Animated.spring(drag, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
        }).start();
      },
    }),
  ).current;

  const fuseShift = fuse.interpolate({
    inputRange: [0, 1],
    outputRange: [-width / 2, 0],
  });

  return (
    <Animated.View
      {...pan.panHandlers}
      style={[
        styles.shadow,
        { marginTop: top, transform: [{ translateY: Animated.add(translateY, drag) }] },
      ]}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Added to favorites</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Undo"
          onPress={() => {
            onUndo();
            leave();
          }}
          style={styles.undo}
        >
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fuse,
            {
              width,
              transform: [{ translateX: fuseShift }, { scaleX: fuse }],
            },
          ]}
        >
          <LinearGradient
            colors={FUSE_STOPS}
            locations={FUSE_AT}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** Native favorite toast. Web resolves SavedListingToast.web.tsx. */
export function SavedListingToast() {
  const queryClient = useQueryClient();
  const toggleSaved = useToggleSaved();
  const insets = useSafeAreaInsets();
  const cardWidth = useWindowDimensions().width - SIDE * 2;
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeSavedToasts((event) => {
      setToasts((prev) => applyToastEvent(prev, event));
    });
  }, []);

  function undo(listing: Listing) {
    const list = queryClient.getQueryData<Listing[]>(savedKeys.list()) ?? [];
    if (!list.some((item) => item.id === listing.id)) return;
    toggleSaved.mutate(listing);
  }

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={styles.host}>
      {toasts.map((toast, index) => (
        <NativeFavoriteToast
          key={toast.key}
          open={toast.open}
          top={index === toasts.length - 1 ? insets.top + 8 : 8}
          width={cardWidth}
          onUndo={() => undo(toast.listing)}
          onExited={() => {
            setToasts((prev) => prev.filter((item) => item.key !== toast.key));
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
    paddingHorizontal: SIDE,
  },
  shadow: {
    alignSelf: "stretch",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  title: {
    flex: 1,
    color: "#121826",
    fontFamily: Studently.type.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
  },
  undo: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 5,
    backgroundColor: "#121826",
    alignItems: "center",
    justifyContent: "center",
  },
  undoText: {
    color: "#ffffff",
    fontFamily: Studently.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  fuse: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: 2,
  },
});
