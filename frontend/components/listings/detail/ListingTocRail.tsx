import { Ionicons } from "@expo/vector-icons";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Skoun } from "@/constants/theme";
import { scrollToListingSection } from "@/lib/scrollToListingSection";

type Ion = ComponentProps<typeof Ionicons>["name"];

export type ListingTocItem = {
  id: string;
  icon: Ion;
  title: string;
};

const IS_WEB = Platform.OS === "web";
const SHELL_ID = "skoun-web-shell";
const DOT = 30;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const MOVE_MS = 320;

const FILLED: Partial<Record<Ion, Ion>> = {
  "flash-outline": "flash",
  "school-outline": "school",
  "home-outline": "home",
  "bed-outline": "bed",
  "document-text-outline": "document-text",
  "grid-outline": "grid",
  "shield-checkmark-outline": "shield-checkmark",
  "map-outline": "map",
};

function prefersReducedMotion(): boolean {
  return (
    IS_WEB &&
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function jumpToSection(id: string) {
  if (!IS_WEB) return;
  scrollToListingSection(id);
}

function stationLeft(index: number, count: number): string {
  if (count <= 1) return `${DOT / 2}px`;
  const t = index / (count - 1);
  return `calc(${DOT / 2}px + ${t} * (100% - ${DOT}px))`;
}

type Props = {
  items: ListingTocItem[];
};

export function ListingTocRail({ items }: Props) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const lockRef = useRef<string | null>(null);
  const idsKey = items.map((item) => item.id).join("|");
  const ids = useMemo(() => idsKey.split("|").filter(Boolean), [idsKey]);

  useEffect(() => {
    if (!items.some((item) => item.id === activeId)) {
      setActiveId(items[0]?.id ?? "");
    }
  }, [activeId, items]);

  useEffect(() => {
    if (!IS_WEB || ids.length === 0) return;

    const shell = document.getElementById(SHELL_ID);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null);
    if (sections.length === 0) return;

    const pick = () => {
      if (lockRef.current) return;
      const lastId = ids[ids.length - 1];
      const clientH = shell?.clientHeight ?? window.innerHeight;
      const scrollTop = shell?.scrollTop ?? window.scrollY;
      const scrollH =
        shell?.scrollHeight ?? document.documentElement.scrollHeight;
      if (scrollTop + clientH >= scrollH - 64) {
        setActiveId((prev) => (prev === lastId ? prev : lastId));
        return;
      }

      const rootTop = shell?.getBoundingClientRect().top ?? 0;
      const focusY = rootTop + clientH * 0.32;
      let current = ids[0];
      for (const el of sections) {
        if (el.getBoundingClientRect().top <= focusY + 8) current = el.id;
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };

    const observer = new IntersectionObserver(pick, {
      root: shell,
      threshold: [0, 0.1, 0.25, 0.5, 1],
    });
    for (const section of sections) observer.observe(section);

    const scrollOpts: AddEventListenerOptions = { passive: true };
    shell?.addEventListener("scroll", pick, scrollOpts);
    window.addEventListener("resize", pick);
    pick();

    return () => {
      observer.disconnect();
      shell?.removeEventListener("scroll", pick, scrollOpts);
      window.removeEventListener("resize", pick);
    };
  }, [ids]);

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  );
  const count = items.length;
  const motionOff = prefersReducedMotion();

  const go = (id: string) => {
    lockRef.current = id;
    setActiveId(id);
    jumpToSection(id);
    if (!IS_WEB) return;
    window.setTimeout(() => {
      if (lockRef.current === id) lockRef.current = null;
    }, 780);
  };

  if (count === 0) return null;

  return (
    <View nativeID="listing-toc" style={styles.rail}>
      {IS_WEB ? (
        <nav aria-label="On this listing" style={NAV}>
          <div style={TRACK}>
            <span style={LINE} />
            <span
              style={{
                ...PROGRESS,
                width: `calc(${activeIndex} / ${Math.max(count - 1, 1)} * (100% - ${DOT}px))`,
                transition: motionOff ? "none" : `width ${MOVE_MS}ms ${EASE}`,
              }}
            />
            <span
              aria-hidden
              style={{
                ...BEAD,
                left: stationLeft(activeIndex, count),
                transition: motionOff ? "none" : `left ${MOVE_MS}ms ${EASE}`,
              }}
            />
            {items.map((item, i) => {
              const active = item.id === activeId;
              const shown =
                hoveredId === item.id || focusedId === item.id;
              const edge =
                i === 0 ? "start" : i === count - 1 ? "end" : "mid";
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-label={item.title}
                  aria-current={active ? "location" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    go(item.id);
                    event.currentTarget.blur();
                  }}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() =>
                    setHoveredId((cur) => (cur === item.id ? null : cur))
                  }
                  onFocus={() => setFocusedId(item.id)}
                  onBlur={() =>
                    setFocusedId((cur) => (cur === item.id ? null : cur))
                  }
                  style={{
                    ...STOP,
                    zIndex: shown ? 3 : 1,
                    boxShadow:
                      focusedId === item.id
                        ? "0 0 0 3px rgba(47, 111, 237, 0.28)"
                        : undefined,
                    borderRadius: 99,
                  }}
                >
                  <span
                    style={{
                      ...DOT_FACE,
                      background: active
                        ? Skoun.color.primary
                        : Skoun.color.surface,
                      borderColor: active
                        ? Skoun.color.primary
                        : hoveredId === item.id
                          ? Skoun.color.primary
                          : "#D9E0EA",
                      boxShadow: active
                        ? "0 0 0 3px rgba(47, 111, 237, 0.16)"
                        : "none",
                      transition: motionOff
                        ? "none"
                        : "background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease",
                    }}
                  >
                    <Ionicons
                      name={
                        active ? (FILLED[item.icon] ?? item.icon) : item.icon
                      }
                      size={15}
                      color={active ? "#fff" : Skoun.color.primary}
                    />
                  </span>
                  <span
                    style={{
                      ...LABEL,
                      ...(edge === "start"
                        ? { left: 0, transform: shown ? "translateY(0)" : "translateY(4px)" }
                        : edge === "end"
                          ? {
                              left: "auto",
                              right: 0,
                              transform: shown
                                ? "translateY(0)"
                                : "translateY(4px)",
                            }
                          : {
                              left: "50%",
                              transform: shown
                                ? "translate(-50%, 0)"
                                : "translate(-50%, 4px)",
                            }),
                      opacity: shown ? 1 : 0,
                    }}
                  >
                    <span
                      style={{
                        ...CARET,
                        ...(edge === "start"
                          ? { left: 11 }
                          : edge === "end"
                            ? { right: 11, left: "auto" }
                            : { left: "50%", marginLeft: -4 }),
                      }}
                    />
                    {item.title}
                  </span>
                </a>
              );
            })}
          </div>
        </nav>
      ) : (
        <View style={styles.nativeRow}>
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <Pressable
                key={item.id}
                onPress={() => go(item.id)}
                accessibilityRole="link"
                accessibilityLabel={item.title}
                style={[styles.nativeDot, active && styles.nativeDotOn]}
              >
                <Ionicons
                  name={active ? (FILLED[item.icon] ?? item.icon) : item.icon}
                  size={15}
                  color={active ? "#fff" : Skoun.color.primary}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const NAV: CSSProperties = {
  margin: 0,
};

const TRACK: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  height: DOT,
};

const LINE: CSSProperties = {
  position: "absolute",
  left: DOT / 2,
  right: DOT / 2,
  top: "50%",
  height: 2,
  background: "#E5EAF1",
  transform: "translateY(-50%)",
  pointerEvents: "none",
  zIndex: 0,
};

const PROGRESS: CSSProperties = {
  position: "absolute",
  left: DOT / 2,
  top: "50%",
  height: 2,
  background: Skoun.color.primary,
  transform: "translateY(-50%)",
  pointerEvents: "none",
  zIndex: 0,
};

const BEAD: CSSProperties = {
  position: "absolute",
  top: "50%",
  width: 8,
  height: 8,
  marginLeft: -4,
  borderRadius: 99,
  background: "#fff",
  border: `2px solid ${Skoun.color.primary}`,
  transform: "translateY(-50%)",
  pointerEvents: "none",
  zIndex: 0,
};

const STOP: CSSProperties = {
  position: "relative",
  width: DOT,
  height: DOT,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  color: "inherit",
  cursor: "pointer",
  outline: "none",
};

const DOT_FACE: CSSProperties = {
  width: DOT,
  height: DOT,
  borderRadius: 99,
  borderWidth: 1.5,
  borderStyle: "solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const LABEL: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  whiteSpace: "nowrap",
  padding: "4px 8px",
  borderRadius: 7,
  background: "#fff",
  border: "1px solid #E5EAF1",
  boxShadow: "0 6px 16px rgba(18, 24, 38, 0.08)",
  color: Skoun.color.ink,
  fontFamily: Skoun.type.bodySemi,
  fontSize: 11,
  lineHeight: "14px",
  letterSpacing: 0.1,
  pointerEvents: "none",
  transition: `opacity 160ms ease, transform 160ms ${EASE}`,
  zIndex: 4,
};

const CARET: CSSProperties = {
  position: "absolute",
  top: -4,
  width: 8,
  height: 8,
  background: "#fff",
  borderLeft: "1px solid #E5EAF1",
  borderTop: "1px solid #E5EAF1",
  transform: "rotate(45deg)",
};

const styles = StyleSheet.create({
  rail: {
    paddingHorizontal: 2,
    paddingBottom: 28,
    overflow: "visible",
  },
  nativeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nativeDot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
    borderColor: "#D9E0EA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.surface,
  },
  nativeDotOn: {
    backgroundColor: Skoun.color.primary,
    borderColor: Skoun.color.primary,
  },
});
