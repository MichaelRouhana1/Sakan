import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { build } from "../../backend/node_modules/esbuild/lib/main.js";
import { chromium, expect } from "@playwright/test";

const SAMPLE_HISTOGRAM = {
  minUsd: 0,
  maxUsd: 1200,
  stepUsd: 25,
  bucketWidthUsd: 50,
  totalCount: 54,
  maxBucketCount: 9,
  clampedOutliers: 2,
  buckets: [
    { minUsd: 0, maxUsd: 50, count: 0 },
    { minUsd: 50, maxUsd: 100, count: 0 },
    { minUsd: 100, maxUsd: 150, count: 1 },
    { minUsd: 150, maxUsd: 200, count: 1 },
    { minUsd: 200, maxUsd: 250, count: 2 },
    { minUsd: 250, maxUsd: 300, count: 1 },
    { minUsd: 300, maxUsd: 350, count: 3 },
    { minUsd: 350, maxUsd: 400, count: 4 },
    { minUsd: 400, maxUsd: 450, count: 6 },
    { minUsd: 450, maxUsd: 500, count: 9 },
    { minUsd: 500, maxUsd: 550, count: 7 },
    { minUsd: 550, maxUsd: 600, count: 5 },
    { minUsd: 600, maxUsd: 650, count: 4 },
    { minUsd: 650, maxUsd: 700, count: 2 },
    { minUsd: 700, maxUsd: 750, count: 3 },
    { minUsd: 750, maxUsd: 800, count: 2 },
    { minUsd: 800, maxUsd: 850, count: 1 },
    { minUsd: 850, maxUsd: 900, count: 0 },
    { minUsd: 900, maxUsd: 950, count: 1 },
    { minUsd: 950, maxUsd: 1000, count: 0 },
    { minUsd: 1000, maxUsd: 1050, count: 0 },
    { minUsd: 1050, maxUsd: 1100, count: 0 },
    { minUsd: 1100, maxUsd: 1150, count: 0 },
    { minUsd: 1150, maxUsd: 1200, count: 2, isOverflow: true },
  ],
};

const HARNESS = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DesktopDesignProvider } from './components/ui/DesktopDesign';
import { BudgetHistogramSlider } from './components/listings/BudgetHistogramSlider';
import { FindFilterBar } from './components/web/FindFilterBar';
import { FindFiltersDialog } from './components/web/FindFiltersDialog';
import { BrowseFiltersPanel, EMPTY_BROWSE_FILTERS } from './components/listings/BrowseFiltersPanel';
import { useSearchListings } from './features/listings/useSearchListings';
import { brandPaletteCss } from './constants/brandPalette';

const SAMPLE = ${JSON.stringify(SAMPLE_HISTOGRAM)};
const styleTag = document.createElement('style');
styleTag.textContent = brandPaletteCss + ' body { margin: 0; font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #F9FAFB; }';
document.head.appendChild(styleTag);

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function SnapshotProbe() {
  const [minRentUsd, setMinRentUsd] = useState(undefined);
  const search = useSearchListings({ areas: ['Hamra'], minRentUsd }, true);
  return (
    <div style={{ padding: 16 }}>
      <button data-testid="trigger-budget-refetch" onClick={() => setMinRentUsd(400)}>Narrow</button>
      <div data-testid="snapshot-state">{search.priceHistogram ? String(search.priceHistogram.totalCount) : 'null'}</div>
      <div data-testid="fetching-state">{search.isFetching ? 'fetching' : 'idle'}</div>
    </div>
  );
}

function App() {
  const mode = new URLSearchParams(window.location.search).get('mode') || 'slider';
  const [range, setRange] = useState({ min: null, max: null });
  const [commits, setCommits] = useState([]);
  const [showHist, setShowHist] = useState(true);
  const [filters, setFilters] = useState({ ...EMPTY_BROWSE_FILTERS, minRentUsd: 350, maxRentUsd: 800 });
  const [dialogApplied, setDialogApplied] = useState(0);
  const [panelApplied, setPanelApplied] = useState(0);

  if (mode === 'snapshot') {
    return (
      <QueryClientProvider client={client}>
        <SnapshotProbe />
      </QueryClientProvider>
    );
  }

  if (mode === 'dropdown') {
    return (
      <QueryClientProvider client={client}>
        <DesktopDesignProvider enabled>
          <div style={{ minHeight: 540, background: '#F9FAFB' }}>
            <div style={{ height: 24 }} />
            <FindFilterBar
              sticky={false}
              filters={filters}
              priceHistogram={SAMPLE}
              sort="newest"
              hasActiveFilters
              onOpenFilters={() => {}}
              onApplyFilters={setFilters}
              onChangeSort={() => {}}
              onClearAll={() => setFilters(EMPTY_BROWSE_FILTERS)}
            />
          </div>
        </DesktopDesignProvider>
      </QueryClientProvider>
    );
  }

  if (mode === 'dialog') {
    return (
      <QueryClientProvider client={client}>
        <DesktopDesignProvider enabled>
          <div style={{ minHeight: 720, background: '#F9FAFB' }}>
            <div data-testid="dialog-applied">{dialogApplied}</div>
            <FindFiltersDialog
              visible
              applied={filters}
              priceHistogram={SAMPLE}
              universities={[]}
              initialSection="budget"
              onClose={() => {}}
              onApply={(next) => {
                setFilters(next);
                setDialogApplied((n) => n + 1);
              }}
            />
          </div>
        </DesktopDesignProvider>
      </QueryClientProvider>
    );
  }

  if (mode === 'mobile-panel') {
    return (
      <QueryClientProvider client={client}>
        <DesktopDesignProvider enabled={false}>
          <div style={{ minHeight: 844, background: '#F9FAFB' }}>
            <div data-testid="panel-applied">{panelApplied}</div>
            <BrowseFiltersPanel
              visible
              mode="standard"
              applied={filters}
              priceHistogram={SAMPLE}
              universities={[]}
              onClose={() => {}}
              onApply={(next) => {
                setFilters(next);
                setPanelApplied((n) => n + 1);
              }}
            />
          </div>
        </DesktopDesignProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={client}>
      <DesktopDesignProvider enabled>
        <div style={{ width: 368, margin: 40, padding: 16, background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <button data-testid="toggle-hist" onClick={() => setShowHist((v) => !v)}>Toggle</button>
          <BudgetHistogramSlider
            compact
            minRentUsd={range.min}
            maxRentUsd={range.max}
            histogram={showHist ? SAMPLE : null}
            onCommit={(min, max) => {
              setRange({ min, max });
              setCommits((c) => [...c, [min, max]]);
            }}
          />
          <output data-testid="commit-count">{commits.length}</output>
          <output data-testid="commit-last">{JSON.stringify(commits[commits.length - 1] ?? null)}</output>
        </div>
      </DesktopDesignProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
`;

test("BudgetHistogramSlider contract, zero-flicker snapshot, and 3 surfaces", { timeout: 60000 }, async () => {
  const frontend = path.resolve(import.meta.dirname, "..");
  const bundle = await build({
    stdin: { contents: HARNESS, resolveDir: frontend, loader: "tsx" },
    absWorkingDir: frontend,
    bundle: true,
    write: false,
    platform: "browser",
    jsx: "automatic",
    resolveExtensions: [".web.tsx", ".web.ts", ".web.js", ".tsx", ".ts", ".jsx", ".js", ".json"],
    define: { "process.env.NODE_ENV": '"test"', __DEV__: "false" },
    alias: { "react-native": "react-native-web" },
    plugins: [
      {
        name: "css-inline",
        setup(b) {
          b.onLoad({ filter: /\.css$/ }, async (args) => {
            const css = await readFile(args.path, "utf8");
            return {
              loader: "js",
              contents: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);`,
            };
          });
        },
      },
      {
        name: "stubs",
        setup(b) {
          b.onResolve(
            {
              filter:
                /^(@expo\/vector-icons|expo-haptics|react-native-safe-area-context|@\/lib\/api|@\/components\/listings\/UniversityCampusFilter|@\/features\/promotions\/activity)$/,
            },
            (args) => ({ path: args.path, namespace: "stub" }),
          );
          b.onLoad({ filter: /.*/, namespace: "stub" }, (args) => {
            if (args.path.includes("expo-haptics")) {
              return {
                resolveDir: frontend,
                loader: "tsx",
                contents: `export const impactAsync = async () => {}; export const selectionAsync = async () => {}; export const ImpactFeedbackStyle = { Light: 'light', Medium: 'medium', Heavy: 'heavy' };`,
              };
            }
            if (args.path.includes("vector-icons")) {
              return {
                resolveDir: frontend,
                loader: "tsx",
                contents: `import React from 'react'; export const Ionicons = ({ name, size = 14, color = '#666' }) => <span style={{ display: 'inline-block', fontSize: Math.max(10, size - 2), color, lineHeight: 1 }}>{name?.includes('chevron') ? '▾' : name?.includes('close') ? '✕' : name?.includes('funnel') ? '⧩' : ''}</span>;`,
              };
            }
            if (args.path.includes("safe-area-context")) {
              return {
                resolveDir: frontend,
                loader: "tsx",
                contents: `export const useSafeAreaInsets = () => ({ top: 12, bottom: 16, left: 0, right: 0 });`,
              };
            }
            if (args.path.includes("UniversityCampusFilter")) {
              return {
                resolveDir: frontend,
                loader: "tsx",
                contents: `import React from 'react'; export const UniversityCampusFilter = () => <div style={{ color: '#8A847C', fontSize: 13 }}>University selector</div>;`,
              };
            }
            if (args.path.includes("promotions/activity")) {
              return {
                resolveDir: frontend,
                loader: "tsx",
                contents: `export const promotionSession = async () => ({ id: '00000000-0000-0000-0000-000000000001' });`,
              };
            }
            return {
              resolveDir: frontend,
              loader: "tsx",
              contents: `export const api = { get: async (url, { params }) => ({ data: await (await fetch(url + '?' + new URLSearchParams(params))).json() }) };`,
            };
          });
        },
      },
    ],
  });

  const server = createServer((req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    if (u.pathname === "/app.js") {
      res.setHeader("content-type", "text/javascript");
      res.end(bundle.outputFiles[0].contents);
      return;
    }
    res.setHeader("content-type", "text/html");
    res.end('<div id="root"></div><script src="/app.js"></script>');
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const shotDir = process.env.SHOT_DIR;
  if (shotDir) await mkdir(shotDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const errors = [];

    // 1. Standalone slider contract
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${baseUrl}/?mode=slider`);

    const bars = page.locator('[data-testid="budget-histogram-bar"]');
    await expect(bars).toHaveCount(24);
    await expect(page.locator('[data-testid="budget-histogram-bar"][data-in-range="true"]')).toHaveCount(24);
    await expect(page.getByTestId("budget-histogram-readout")).toHaveText("54 units");

    // Hover a bar -> shows bucket range & count
    await bars.nth(9).hover();
    await expect(page.getByTestId("budget-histogram-readout")).toHaveText("$450–$500 · 9 units");

    // Simulate live drag without committing until release
    const lowSlider = page.locator('input[data-studently-range="low"]');
    await lowSlider.evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(el, "350");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // Live visual update happened, zero commits yet
    await expect(page.getByTestId("commit-count")).toHaveText("0");
    await expect(page.locator('[data-testid="budget-histogram-bar"][data-in-range="false"]')).toHaveCount(7);

    // Release fires commit once
    await lowSlider.dispatchEvent("change");
    await expect(page.getByTestId("commit-count")).toHaveText("1");
    await expect(page.getByTestId("commit-last")).toHaveText("[350,null]");

    // Hiding histogram when null (<5 listings)
    await page.getByTestId("toggle-hist").click();
    await expect(page.getByTestId("budget-histogram")).toHaveCount(0);

    // 2. Zero-flicker snapshot across budget refetch
    let resolveDelayed;
    const delayed = new Promise((r) => {
      resolveDelayed = r;
    });
    await page.route("**/api/listings*", async (route) => {
      const u = new URL(route.request().url());
      const isMap = u.searchParams.get("view") === "map";
      if (!isMap && u.searchParams.get("minRentUsd")) {
        await delayed;
      }
      await route.fulfill({
        json: {
          data: [],
          featured: [],
          campuses: [],
          priceHistogram: isMap ? null : SAMPLE_HISTOGRAM,
          pagination: { page: 1, pageSize: 24, total: 0, totalMatching: 0, hasNext: false },
        },
      });
    });
    await page.goto(`${baseUrl}/?mode=snapshot`);
    await expect(page.getByTestId("snapshot-state")).toHaveText("54");
    await page.getByTestId("trigger-budget-refetch").click();
    await expect(page.getByTestId("fetching-state")).toHaveText("fetching");
    // Must stay 54 (never blink to null) while budget refetch is in-flight!
    await expect(page.getByTestId("snapshot-state")).toHaveText("54");
    resolveDelayed();
    await expect(page.getByTestId("fetching-state")).toHaveText("idle");
    await expect(page.getByTestId("snapshot-state")).toHaveText("54");

    // 3. Surface 1: Desktop Budget dropdown with narrowed range
    await page.goto(`${baseUrl}/?mode=dropdown`);
    await page.getByRole("button", { name: "$350–$800" }).click();
    await expect(page.getByTestId("budget-histogram")).toBeVisible();
    await expect(page.locator('[data-testid="budget-histogram-bar"][data-in-range="true"]')).toHaveCount(9);
    if (shotDir) {
      await page.screenshot({
        path: path.join(shotDir, "surface-1-desktop-dropdown.png"),
        clip: { x: 0, y: 0, width: 760, height: 390 },
      });
    }

    // 4. Surface 2: Desktop Filters dialog (Budget tab) with narrowed range (draft state until Apply)
    await page.goto(`${baseUrl}/?mode=dialog`);
    await expect(page.getByTestId("budget-histogram")).toBeVisible();
    await expect(page.locator('[data-testid="budget-histogram-bar"][data-in-range="true"]')).toHaveCount(9);
    await expect(page.getByTestId("dialog-applied")).toHaveText("0");
    if (shotDir) {
      await page.waitForTimeout(450);
      await page.screenshot({
        path: path.join(shotDir, "surface-2-desktop-dialog.png"),
      });
    }

    // 5. Surface 3: Mobile BrowseFiltersPanel with section pills + narrowed range
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    mobilePage.on("pageerror", (e) => errors.push(e.message));
    await mobilePage.goto(`${baseUrl}/?mode=mobile-panel`);
    const pillsBar = mobilePage.getByTestId("filter-section-pills");
    await expect(pillsBar).toBeVisible();
    await expect(pillsBar.getByRole("radio", { name: "University" })).toHaveAttribute("aria-checked", "true");
    await pillsBar.getByRole("radio", { name: "Rent" }).click();
    await expect(pillsBar.getByRole("radio", { name: "Rent" })).toHaveAttribute("aria-checked", "true");
    const mobileHist = mobilePage.getByTestId("budget-histogram");
    await mobileHist.scrollIntoViewIfNeeded();
    await expect(mobileHist).toBeVisible();
    await expect(mobilePage.locator('[data-testid="budget-histogram-bar"][data-in-range="true"]')).toHaveCount(9);
    await expect(mobilePage.getByTestId("panel-applied")).toHaveText("0");
    if (shotDir) {
      await mobilePage.waitForTimeout(260);
      await mobilePage.screenshot({
        path: path.join(shotDir, "surface-3-mobile-panel.png"),
      });
    }

    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
