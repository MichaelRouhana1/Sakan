import {
  Building2,
  ChartLine,
  ChevronDown,
  ChevronUp,
  Coins,
  Flag,
  House,
  KeyRound,
  MapPinned,
  Menu,
  MessageSquare,
  Moon,
  ShieldCheck,
  Sun,
  TimerOff,
  Users,
  Wallet,
  X,
} from "lucide-react-native";
import { Link, Slot, usePathname } from "expo-router";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { ADMIN_CSS } from "@/styles/adminCssText";
import { H } from "./h";
import { NeuIconButton } from "./NeuPrimitives";
import {
  readStoredTheme,
  storeTheme,
  type AdminTheme,
} from "./theme";

const NAV = [
  { href: "/admin/users", label: "Users", icon: Users, live: true },
  { href: "/admin/listings", label: "Listings", icon: House, live: true },
  { href: "/admin/expired", label: "Expired", icon: TimerOff, live: true },
  { href: "/admin/reports", label: "Reports", icon: Flag, live: true },
  { href: "/admin/communication", label: "Comms", icon: MessageSquare, live: true },
  { href: "/admin/trust", label: "Trust", icon: ShieldCheck, live: true },
  { href: "/admin/payments", label: "Payments", icon: Wallet, live: true },
  { href: "/admin/pricing", label: "Pricing", icon: Coins, live: true },
  { href: "/admin/analytics", label: "Analytics", icon: ChartLine, live: true },
  { href: "/admin/universities", label: "Institutions", icon: Building2, live: true },
  { href: "/admin/zoning", label: "Zoning", icon: MapPinned, live: true },
  { href: "/admin/security", label: "Security", icon: KeyRound, live: true },
] as const;

type Props = { children?: ReactNode };

export function AdminNeuShell({ children }: Props) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<AdminTheme>(() => readStoredTheme());
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const fontId = "skoun-admin-fonts";
    if (!document.getElementById(fontId)) {
      const font = document.createElement("link");
      font.id = fontId;
      font.rel = "stylesheet";
      font.href =
        "https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Outfit:wght@400;500;600;700&display=swap";
      document.head.appendChild(font);
    }
    // CSS already ships in +html; keep a dedicated tag as fallback for HMR.
    const id = "skoun-admin-css";
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }
    if (style.textContent !== ADMIN_CSS) {
      style.textContent = ADMIN_CSS;
    }
  }, []);

  /**
   * Hoist scope onto <html> so Tailwind `important: .skoun-admin` still matches
   * during route swaps (outgoing nodes can paint one frame outside the shell).
   * useLayoutEffect: before paint, so tab switches don't FOUC unstyled buttons.
   */
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.classList.add("skoun-admin");
    html.setAttribute("data-theme", theme);
    const clay = getComputedStyle(html).getPropertyValue("--admin-clay-100").trim();
    const prevHtml = html.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    if (clay) {
      html.style.backgroundColor = clay;
      document.body.style.backgroundColor = clay;
    }
    return () => {
      html.classList.remove("skoun-admin");
      html.removeAttribute("data-theme");
      html.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => {
      const next: AdminTheme = current === "dark" ? "light" : "dark";
      storeTheme(next);
      return next;
    });
  }

  return (
    <View style={{ flex: 1, minHeight: "100%" as unknown as number, overflow: "visible" }}>
      <H
        className="skoun-admin bg-clay-100 text-clay-900"
        data-theme={theme}
      >
        <H className="flex min-h-[100dvh]">
        {mobileOpen ? (
          <H
            className="admin-scrim fixed inset-0 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <H
          as="aside"
          className={[
            "fixed inset-y-0 left-0 z-50 isolate flex h-[100dvh] w-64 flex-col overflow-hidden bg-clay-100 px-3 py-5 transition-transform duration-panel lg:w-[248px] lg:translate-x-0",
            mobileOpen ? "translate-x-0 shadow-neu" : "-translate-x-full lg:translate-x-0 lg:shadow-none",
          ].join(" ")}
        >
          <H className="mb-6 flex shrink-0 items-start justify-between gap-3 px-1">
            <H>
              <H
                as="p"
                className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
              >
                Skoun Ops
              </H>
              <H as="p" className="mt-1 font-display text-xl font-semibold text-clay-900">
                Desk
              </H>
            </H>
            <H className="flex items-center gap-2">
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
              <H className="lg:hidden">
                <NeuIconButton
                  ariaLabel="Close navigation"
                  onClick={() => setMobileOpen(false)}
                >
                  <X size={18} strokeWidth={1.75} />
                </NeuIconButton>
              </H>
            </H>
          </H>

          <AdminNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />

        </H>

        <H className="hidden w-[248px] shrink-0 lg:block" aria-hidden />

        <H className="flex min-w-0 flex-1 flex-col">
          <H
            as="header"
            className="flex items-center gap-3 px-4 py-4 md:px-6 lg:hidden"
          >
            <NeuIconButton
              ariaLabel="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} strokeWidth={1.75} />
            </NeuIconButton>
            <H as="p" className="flex-1 font-display text-base font-semibold">
              Skoun Ops
            </H>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </H>
          <H
            as="main"
            className="relative isolate min-w-0 flex-1 overflow-x-hidden bg-clay-100 px-4 pb-8 pt-2 md:px-6 lg:px-8 lg:pt-8"
          >
            <H key={pathname} className="min-h-full">
              {children ?? <Slot />}
            </H>
          </H>
        </H>
      </H>
      </H>
    </View>
  );
}

const NAV_SCROLL_ID = "skoun-admin-nav-scroll";

function navActive(pathname: string, href: string) {
  if (href === "/admin/analytics") {
    return pathname === "/admin/analytics" || pathname === "/admin/conversion";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    let cancelled = false;
    let bound: HTMLElement | null = null;
    const observed = new Set<Element>();
    const ro = new ResizeObserver(() => {
      bind();
      sync();
    });

    function sync() {
      if (cancelled) return;
      const el = document.getElementById(NAV_SCROLL_ID);
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      const overflow = max > 8;
      const nextUp = overflow && el.scrollTop > 8;
      const nextDown = overflow && el.scrollTop < max - 8;
      setCanUp((prev) => (prev === nextUp ? prev : nextUp));
      setCanDown((prev) => (prev === nextDown ? prev : nextDown));
    }

    function observe(node: Element | null) {
      if (!node || observed.has(node)) return;
      ro.observe(node);
      observed.add(node);
    }

    function bind() {
      const el = document.getElementById(NAV_SCROLL_ID);
      if (!el) return;
      if (bound !== el) {
        bound?.removeEventListener("scroll", sync);
        el.addEventListener("scroll", sync, { passive: true });
        bound = el;
      }
      observe(el);
      observe(el.firstElementChild);
      observe(el.closest("aside"));
    }

    bind();
    sync();
    const raf = requestAnimationFrame(sync);
    const timeout = window.setTimeout(sync, 80);
    window.addEventListener("resize", sync);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
      bound?.removeEventListener("scroll", sync);
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  function nudge(dir: -1 | 1) {
    if (typeof document === "undefined") return;
    document
      .getElementById(NAV_SCROLL_ID)
      ?.scrollBy({ top: dir * 140, behavior: "smooth" });
  }

  function syncFrom(scroller: HTMLElement) {
    const max = scroller.scrollHeight - scroller.clientHeight;
    const overflow = max > 8;
    const nextUp = overflow && scroller.scrollTop > 8;
    const nextDown = overflow && scroller.scrollTop < max - 8;
    setCanUp((prev) => (prev === nextUp ? prev : nextUp));
    setCanDown((prev) => (prev === nextDown ? prev : nextDown));
  }

  return (
    <H className="relative min-h-0 flex-1">
      {canUp ? (
        <ScrollHint key="hint-up" edge="top" onClick={() => nudge(-1)} />
      ) : null}
      <H
        key="admin-nav-scroll"
        as="nav"
        id={NAV_SCROLL_ID}
        aria-label="Admin sections"
        onScroll={(event: { currentTarget: HTMLElement }) => {
          syncFrom(event.currentTarget);
        }}
        className="neu-scroll flex h-full flex-col overflow-y-auto overscroll-contain px-2 pb-12 pt-2"
      >
        <H className="flex flex-col gap-3">
          {NAV.map((item) => {
            const active = navActive(pathname, item.href);
            const Icon = item.icon;
            if (!item.live) {
              return (
                <H
                  as="span"
                  key={item.href}
                  className="flex cursor-not-allowed items-center gap-3 rounded-neu-md px-3 py-2.5 text-sm text-clay-500 opacity-60"
                  title="Coming next"
                >
                  <Icon size={20} strokeWidth={1.75} />
                  {item.label}
                </H>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onPress={onNavigate}
                className={[
                  "flex cursor-pointer items-center gap-3 rounded-neu-md px-3 py-2.5 text-sm font-medium transition-shadow duration-press",
                  active
                    ? "bg-clay-100 text-moss shadow-press"
                    : "bg-clay-100 text-clay-700 shadow-neu-sm hover:text-clay-900",
                ].join(" ")}
              >
                <Icon size={20} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </H>
      </H>
      {canDown ? (
        <ScrollHint key="hint-down" edge="bottom" onClick={() => nudge(1)} />
      ) : null}
    </H>
  );
}

function ScrollHint({
  edge,
  onClick,
}: {
  edge: "top" | "bottom";
  onClick: () => void;
}) {
  const top = edge === "top";
  return (
    <H
      className={[
        "pointer-events-none absolute inset-x-0 z-10 flex justify-center",
        top ? "neu-nav-fade-top top-0 pb-8 pt-1" : "neu-nav-fade-bottom bottom-0 pb-1 pt-8",
      ].join(" ")}
    >
      <H
        as="button"
        type="button"
        aria-label={top ? "Scroll navigation up" : "Scroll navigation down"}
        onClick={onClick}
        className="pointer-events-auto inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-clay-100 text-clay-700 shadow-neu-sm transition-shadow duration-press active:shadow-press focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      >
        {top ? (
          <ChevronUp size={16} strokeWidth={2} />
        ) : (
          <ChevronDown size={16} strokeWidth={2} />
        )}
      </H>
    </H>
  );
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: AdminTheme;
  onToggle: () => void;
}) {
  const dark = theme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <H
      as="button"
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={label}
      onClick={onToggle}
      className="relative mt-0.5 h-9 w-16 shrink-0 cursor-pointer rounded-full bg-clay-100 p-1 shadow-neu-in-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
    >
      <H
        className={[
          "pointer-events-none flex h-7 w-7 items-center justify-center rounded-full bg-clay-100 shadow-neu-sm transition-transform duration-panel",
          dark ? "translate-x-7" : "translate-x-0",
        ].join(" ")}
      >
        {dark ? (
          <Moon size={14} strokeWidth={2} color="var(--admin-moss)" />
        ) : (
          <Sun size={14} strokeWidth={2} color="var(--admin-ochre)" />
        )}
      </H>
    </H>
  );
}
