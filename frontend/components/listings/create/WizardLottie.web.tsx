import type { AnimationItem } from "lottie-web";
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { Image, Platform, View } from "react-native";
import {
  BRAND_PALETTE_EVENT,
  readStoredBrandPalette,
  type BrandPaletteId,
} from "@/constants/brandPalette";
import { WIZARD_LOTTIE_MODULES } from "@/lib/wizardLottieSources";
import { tintWizardLottie } from "@/lib/wizardLottieTint";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { WizardLottieAssetId } from "@/lib/wizardLottieFrame";

export type { WizardStepId } from "@/lib/wizardLottieFrame";

type Props = {
  assetId: WizardLottieAssetId;
  width: number;
  height: number;
  reducedMotion?: boolean;
  loop?: boolean;
};

const dataCache = new Map<WizardLottieAssetId, Promise<object>>();
type Player = { key: string; container: HTMLDivElement; animation: AnimationItem };
const NEXT: Partial<Record<WizardLottieAssetId, WizardLottieAssetId[]>> = {
  type: ['location'], location: ['utilities'], utilities: ['water', 'rules'],
  water: ['rules'], rules: ['photos'], photos: ['specs', 'pricing'],
  specs: ['photos'], pricing: ['copy'], copy: ['review'],
};

function moduleUri(mod: unknown): string | null {
  if (typeof mod === "string" && mod.length > 0) return mod;
  if (mod && typeof mod === "object" && "uri" in mod) {
    const uri = (mod as { uri: unknown }).uri;
    if (typeof uri === "string" && uri.length > 0) return uri;
  }
  if (typeof mod === "number") {
    return Image.resolveAssetSource(mod)?.uri ?? null;
  }
  return null;
}

function isLottieData(mod: unknown): mod is object {
  return (
    !!mod &&
    typeof mod === "object" &&
    "layers" in mod &&
    "v" in mod
  );
}

function loadAnimationData(id: WizardLottieAssetId): Promise<object> {
  const hit = dataCache.get(id);
  if (hit) return hit;

  const pending = (async () => {
    const mod: unknown = WIZARD_LOTTIE_MODULES[id];
    if (isLottieData(mod)) return mod;
    const uri = moduleUri(mod);
    if (!uri) {
      throw new Error(`Missing Lottie asset URI for ${id}`);
    }
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error(`Lottie fetch failed (${res.status}) for ${id}`);
    }
    return (await res.json()) as object;
  })();

  dataCache.set(id, pending);
  return pending;
}

export function WizardLottie({ assetId, width, height, reducedMotion, loop = true }: Props) {
  const preference = useReducedMotion();
  const reduce = reducedMotion ?? preference;
  const host = useRef<HTMLDivElement | null>(null);
  const players = useRef(new Map<string, Promise<Player>>());
  const active = useRef<Player | null>(null);
  const [palette, setPalette] = useState<BrandPaletteId>(() =>
    Platform.OS === "web" ? readStoredBrandPalette() : "madder",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setPalette(readStoredBrandPalette());
    window.addEventListener(BRAND_PALETTE_EVENT, sync);
    return () => window.removeEventListener(BRAND_PALETTE_EVENT, sync);
  }, []);

  const prepare = useCallback((id: WizardLottieAssetId) => {
    const key = `${palette}:${id}`;
    const cached = players.current.get(key);
    if (cached) return cached;
    const pending = Promise.all([loadAnimationData(id), import('lottie-web')]).then(([data, { default: lottie }]) => new Promise<Player>((resolve, reject) => {
      const container = document.createElement('div');
      Object.assign(container.style, { width: '100%', height: '100%' });
      const animation = lottie.loadAnimation({
        container, renderer: 'svg', loop: false, autoplay: false,
        // Each player owns its data: lottie mutates it while preparing layers.
        animationData: palette === 'madder' ? tintWizardLottie(data, palette, id) : structuredClone(data),
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      });
      const ready = () => resolve({ key, container, animation });
      animation.addEventListener('DOMLoaded', ready);
      animation.addEventListener('data_failed', () => { animation.destroy(); reject(new Error('Could not prepare wizard artwork')); });
      if (animation.isLoaded) ready();
    }));
    players.current.set(key, pending);
    void pending.catch(() => { if (players.current.get(key) === pending) players.current.delete(key); });
    return pending;
  }, [palette]);

  useEffect(() => () => {
    for (const pending of players.current.values()) void pending.then(player => player.animation.destroy()).catch(() => {});
    players.current.clear();
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    void prepare(assetId).then(player => {
      if (cancelled) return;
      const changed = active.current !== player;
      el.getAnimations().forEach(animation => animation.cancel());
      active.current?.animation.pause();
      active.current = player;
      el.replaceChildren(player.container);
      player.animation.resize();
      player.animation.loop = !reduce && loop;
      if (reduce) player.animation.goToAndStop(Math.floor(player.animation.totalFrames * .55), true);
      else if (changed && !loop) player.animation.goToAndPlay(0, true);
      else player.animation.play();
      if (changed && !reduce) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [assetId, loop, prepare, reduce]);

  // Prepare likely next artwork while the question is idle, not during Next.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const targets = NEXT[assetId] ?? [];
      void Promise.allSettled(targets.map(prepare)).then(() => {
        const keep = new Set([`${palette}:${assetId}`, ...targets.map(id => `${palette}:${id}`), active.current?.key]);
        for (const [key, pending] of players.current) {
          if (players.current.size <= 4) break;
          if (!keep.has(key)) { players.current.delete(key); void pending.then(player => player.animation.destroy()).catch(() => {}); }
        }
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [assetId, palette, prepare]);

  useEffect(() => { active.current?.animation.resize(); }, [width, height]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...({ dataSet: { wizardArtAsset: assetId, wizardMotion: reduce ? 'still' : 'playing' } } as object)}
      style={{
        width,
        height,
        alignSelf: "center",
        pointerEvents: "none",
      }}
    >
      {createElement("div", {
        ref: host,
        style: { width, height },
      })}
    </View>
  );
}
