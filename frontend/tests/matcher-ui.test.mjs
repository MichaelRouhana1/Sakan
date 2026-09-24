import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../../backend/node_modules/esbuild/lib/main.js";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const output = path.join(frontend, ".expo/matcher-tests");
const uni = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "lau-beirut",
  name: "LAU Beirut",
  displayName: "LAU Beirut",
  lat: 33.9,
  lng: 35.48,
};
const rows = [
  {
    id: "over",
    title: "A little more room",
    monthlyRentUsd: 650,
    electricity: "generator_24_7",
    wifiIncluded: false,
    boostedUntil: "2099-01-01",
  },
  { id: "unknown", title: "A quiet studio", monthlyRentUsd: 500 },
  {
    id: "best",
    title: "Hamra sunlit studio",
    monthlyRentUsd: 450,
    electricity: "solar",
    wifiIncluded: true,
  },
].map((r) => ({
  status: "active",
  listingType: "studio",
  area: "Hamra",
  lat: 33.9,
  lng: 35.48,
  priceBasis: "per_unit_month",
  genderRestriction: "girls_only",
  createdAt: "2026-09-01",
  photos: [],
  ...r,
}));

test("guided matcher browser flow", { timeout: 180000 }, async (t) => {
  await mkdir(output, { recursive: true });
  const bundle = await build({
    entryPoints: [path.join(frontend, "tests/matcher-harness.tsx")],
    absWorkingDir: frontend,
    bundle: true,
    write: false,
    platform: "browser",
    jsx: "automatic",
    resolveExtensions: [
      ".web.tsx",
      ".web.ts",
      ".web.js",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".json",
    ],
    define: { "process.env.NODE_ENV": '"test"', __DEV__: "false" },
    alias: {
      "react-native": "react-native-web",
      "react-native-svg": path.join(
        frontend,
        "node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js",
      ),
    },
    plugins: [
      {
        name: "test-boundaries",
        setup(b) {
          b.onResolve(
            {
              filter:
                /^(expo-router|@\/lib\/api|@\/features\/saved\/useSavedListings)$/,
            },
            () => ({ path: path.join(frontend, "tests/matcher-harness.tsx") }),
          );
          b.onResolve(
            {
              filter:
                /^(@expo\/vector-icons|@\/components\/listings\/ListingCardCarousel)$/,
            },
            (args) => ({ path: args.path, namespace: "stub" }),
          );
          b.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({
            resolveDir: frontend,
            loader: "tsx",
            contents: args.path.includes("ListingCardCarousel")
              ? 'import {View} from "react-native";export const ListingCardCarousel=()=> <View style={{height:180,backgroundColor:"#dce6ed"}} />;'
              : "export const Ionicons=()=>null;",
          }));
        },
      },
    ],
  });
  const html = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>@font-face{font-family:DMSans_400Regular;src:url('/font-400.ttf')}@font-face{font-family:DMSans_500Medium;src:url('/font-500.ttf')}@font-face{font-family:DMSans_600SemiBold;src:url('/font-600.ttf')}@font-face{font-family:DMSans_700Bold;src:url('/font-700.ttf')}*{box-sizing:border-box}body{margin:0;background:#F9FAFB}#root{min-height:100vh}</style><div id="root"></div><script src="/app.js"></script>`;
  const server = createServer(async (req, res) => {
    if (req.url === "/app.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(bundle.outputFiles[0].contents);
    } else if (req.url?.startsWith("/font-")) {
      const w = req.url.match(/font-(\d+)/)[1];
      const weight = {
        400: "400Regular",
        500: "500Medium",
        600: "600SemiBold",
        700: "700Bold",
      }[w];
      res.setHeader("Content-Type", "font/ttf");
      res.end(
        await readFile(
          path.join(
            frontend,
            `node_modules/@expo-google-fonts/dm-sans/${weight}/DMSans_${weight}.ttf`,
          ),
        ),
      );
    } else {
      res.setHeader("Content-Type", "text/html");
      res.end(html);
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  async function pageFor(width = 1024, options = {}) {
    const page = await browser.newPage({
      viewport: { width, height: options.height ?? 900 },
      reducedMotion: "reduce",
    });
    if (options.storageFailure)
      await page.addInitScript(() => {
        Storage.prototype.getItem = () => {
          throw new Error("storage unavailable");
        };
        Storage.prototype.setItem = () => {
          throw new Error("storage unavailable");
        };
      });
    page.on("pageerror", (e) => errors.push(e.message));
    const requests = [];
    await page.route("**/api/universities", (r) =>
      r.fulfill({ json: { data: options.campuses ?? [uni] } }),
    );
    await page.route("**/api/search/suggestions*", (r) =>
      r.fulfill({
        json: {
          data: {
            areas: [
              {
                type: "area",
                label: "Hamra",
                center: { lat: 33.9, lng: 35.48 },
              },
            ],
            universities: [],
            listings: [],
          },
        },
      }),
    );
    await page.route("**/api/listings*", async (r) => {
      const params = Object.fromEntries(
        new URL(r.request().url()).searchParams,
      );
      requests.push(params);
      if (options.listings) return options.listings(r, params);
      await r.fulfill({
        json: {
          data: rows.filter(
            (l) =>
              !params.maxRentUsd ||
              l.monthlyRentUsd <= Number(params.maxRentUsd),
          ),
        },
      });
    });
    await page.goto(`${base}${options.path ?? ""}`);
    await expect(page.getByTestId("result-best")).toBeVisible();
    return { page, requests };
  }
  try {
    await t.test(
      "all six questions keep their prompt and answer tray usable on short screens",
      async () => {
        const choices = [
          "Studio",
          "Up to $500",
          "LAU Beirut",
          "Girls-only listings",
          "Solar",
          "Wi-Fi included",
        ];
        for (const [width, height] of [
          [375, 667],
          [1440, 720],
        ]) {
          const { page } = await pageFor(width, {
            height,
            path: "/?name=Maya",
            campuses: [
              uni,
              {
                ...uni,
                id: "22222222-2222-4222-8222-222222222222",
                name: "American University of Beirut",
                displayName: "American University of Beirut",
                slug: "aub",
              },
              {
                ...uni,
                id: "33333333-3333-4333-8333-333333333333",
                name: "Lebanese University",
                displayName: "Lebanese University",
                slug: "lu",
              },
            ],
          });
          await page
            .getByRole("button", { name: "Find my place", exact: true })
            .click();
          await page.evaluate(() => document.fonts.ready);
          for (let step = 0; step < choices.length; step++) {
            if (step === 2) {
              await expect(
                page.getByTestId("matcher-current-question"),
              ).toBeInViewport({ ratio: 1 });
              await expect(
                page.getByRole("textbox", { name: "Search campuses" }),
              ).toBeFocused();
              await page.screenshot({
                animations: "disabled",
                path: path.join(
                  output,
                  `redesign-${width}-location-search.png`,
                ),
              });
            }
            await page
              .getByRole("button", { name: choices[step], exact: true })
              .click();
            await expect(
              page.getByTestId("matcher-current-question"),
            ).toBeInViewport({ ratio: 1 });
            await expect(page.getByTestId("matcher-composer")).toBeInViewport({
              ratio: 1,
            });
            if (step === 0) {
              await expect(
                page.getByText("Hi Maya!", { exact: true }),
              ).toBeInViewport({ ratio: 1 });
              await expect(
                page.getByRole("button", {
                  name: "No preference",
                  exact: true,
                }),
              ).toHaveAttribute("aria-pressed", "false");
            }
            await expect(
              page.getByRole("button", { name: "Continue", exact: true }),
            ).toBeInViewport({ ratio: 1 });
            assert.equal(
              await page
                .getByTestId("matcher-composer")
                .evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
              true,
            );
            await page.screenshot({
              animations: "disabled",
              path: path.join(output, `redesign-${width}-step-${step + 1}.png`),
            });
            await page
              .getByRole("button", { name: "Continue", exact: true })
              .click();
          }
          await expect(
            page.getByRole("button", {
              name: "Find my best matches",
              exact: true,
            }),
          ).toBeInViewport({ ratio: 1 });
          await page.screenshot({
            animations: "disabled",
            path: path.join(output, `redesign-${width}-complete.png`),
          });
          await page.close();
        }
      },
    );
    await t.test(
      "right drawer, personalized greeting, persistent transcript and staged answer editing",
      async () => {
        const { page } = await pageFor(1024, { path: "/?name=Maya" });
        await page
          .getByRole("button", { name: "Find my place", exact: true })
          .click();

        await expect(page.getByText("Hi Maya!", { exact: true })).toBeVisible();
        const drawer = page.getByTestId("matcher-drawer");
        const box = await drawer.boundingBox();
        assert.ok(box);
        assert.equal(Math.round(box.width), Math.round(1024 * 0.42));
        assert.equal(Math.round(box.x + box.width), 1024);
        assert.equal(Math.round(box.y), 0);
        assert.equal(Math.round(box.height), 900);

        await page.getByRole("button", { name: "Studio", exact: true }).click();
        await expect(
          page.getByRole("button", {
            name: /Edit answer to What kind of place feels right\?/,
          }),
        ).toHaveCount(0);
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        const typeAnswer = page.getByRole("button", {
          name: /Edit answer to What kind of place feels right\?: Studio/,
        });
        await expect(typeAnswer).toBeVisible();

        await page
          .getByRole("button", { name: "Up to $500", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        await expect(
          page.getByRole("button", {
            name: /Edit answer to What monthly rent works for you\?: Up to \$500\/month/,
          }),
        ).toBeVisible();

        await typeAnswer.click();
        await page.getByRole("button", { name: "Studio", exact: true }).click();
        await page
          .getByRole("button", { name: "Private room", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Cancel edit", exact: true })
          .click();
        await expect(typeAnswer).toBeVisible();

        await typeAnswer.click();
        await page.getByRole("button", { name: "Studio", exact: true }).click();
        await page
          .getByRole("button", { name: "Private room", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Save changes", exact: true })
          .click();
        await expect(
          page.getByRole("button", {
            name: /Edit answer to What kind of place feels right\?: Private room/,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "LAU Beirut", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByLabel("Question 3 of 6", { exact: true }),
        ).toBeVisible();
        await page.close();
      },
    );

    await t.test(
      "complete flow, truthful cards, hard versus soft request, reveal and save interactions",
      async () => {
        const { page, requests } = await pageFor();
        await page
          .getByRole("button", { name: "Find my place", exact: true })
          .click();
        await expect(
          page.getByText("Hi there!", { exact: true }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Studio", exact: true }).click();
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Up to $500", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        await page
          .getByRole("button", { name: "LAU Beirut", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Girls-only listings", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        await page.getByRole("button", { name: "Solar", exact: true }).click();
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Wi-Fi included", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        await expect(
          page.getByRole("button", {
            name: "Find my best matches",
            exact: true,
          }),
        ).toBeEnabled();
        await page
          .getByRole("button", { name: "Find my best matches", exact: true })
          .click();
        await expect(
          page.getByText("Closest to your prefs", { exact: true }),
        ).toHaveCount(1);
        await expect(
          page.locator('[data-testid^="result-"]').first(),
        ).toHaveAttribute("data-testid", "result-best");
        await expect
          .poll(() => requests.at(-1)?.genderRestrictions)
          .toBe("girls_only");
        for (const key of [
          "maxRentUsd",
          "campusId",
          "electricity",
          "wifiIncluded",
          "match",
          "sort",
        ])
          assert.equal(
            requests.at(-1)[key],
            key === "sort" ? "newest" : undefined,
            key,
          );
        const unknown = page.getByTestId("result-unknown");
        await expect(
          unknown.getByText("Solar Power", { exact: true }),
        ).toHaveCount(0);
        await expect(
          unknown.getByText("UPS Wi-Fi", { exact: true }),
        ).toHaveCount(0);
        const best = page.getByTestId("result-best");
        await best.getByRole("button", { name: "Why this one" }).click();
        await expect(best.getByText("100/100 preference score")).toBeVisible();
        await expect(best.getByText("Per unit / month")).toBeVisible();
        await best.getByRole("button", { name: "Save listing" }).click();
        assert.equal(await page.evaluate(() => window.savedListing.id), "best");
        await page.reload();
        await expect(
          page.getByText("Closest to your prefs", { exact: true }),
        ).toHaveCount(1);
        await page
          .getByRole("button", { name: "Set manual budget 400" })
          .click();
        await expect.poll(() => requests.at(-1)?.maxRentUsd).toBe("400");
        await expect(
          page.getByText(
            "No live listings meet these requirements. Edit your requirements or clear filters to explore more.",
          ),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Remove manual budget" })
          .click();
        await expect(page.getByTestId("result-best")).toBeVisible();
        await page.getByRole("button", { name: "Sort newest" }).click();
        await expect(
          page.getByText("Closest to your prefs", { exact: true }),
        ).toHaveCount(0);
        await page
          .getByRole("button", { name: "Best matches", exact: true })
          .click();
        await expect(
          page.getByText("Closest to your prefs", { exact: true }),
        ).toHaveCount(1);
        await page.close();
      },
    );
    await t.test(
      "Back, skip, cancel, saved draft, partial apply and keyboard containment",
      async () => {
        const { page } = await pageFor(375);
        await page
          .getByRole("button", { name: "Find my place", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Private room", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Up to $300", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Must have", exact: true })
          .click();
        await page.getByRole("button", { name: "Back", exact: true }).click();
        await expect(
          page.getByRole("button", { name: "Private room", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await page.keyboard.press("Escape");
        assert.equal(
          JSON.parse(await page.getByTestId("state").textContent()).prefs,
          null,
        );
        await page
          .getByRole("button", { name: "Find my place", exact: true })
          .click();
        await expect(
          page.getByRole("button", { name: "Private room", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await page.getByRole("button", { name: "Skip", exact: true }).click();
        await expect(
          page.getByRole("button", { name: "Up to $300", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await page
          .getByRole("button", { name: "No limit", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Show what I have so far" })
          .click();
        assert.equal(
          JSON.parse(await page.getByTestId("state").textContent()).prefs,
          null,
        );
        await page.close();
      },
    );
    await t.test(
      "responsive sheet screenshots and no page overflow",
      async () => {
        for (const width of [375, 768, 1024, 1440]) {
          const { page } = await pageFor(width);
          await page
            .getByRole("button", { name: "Find my place", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Studio", exact: true })
            .click();
          await page.evaluate(() => document.fonts.ready);
          await expect(
            page.getByRole("button", { name: "Continue", exact: true }),
          ).toBeInViewport();
          await page.screenshot({
            path: path.join(output, `matcher-${width}.png`),
          });
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          await page.getByRole("button", { name: "Close guide" }).focus();
          await page.keyboard.press("Shift+Tab");
          const focused = await page.evaluate(
            () => document.activeElement?.textContent,
          );
          assert.equal(focused, "See matches so far");
          await page.close();
        }
      },
    );
    await t.test(
      "storage failure does not block partial application",
      async () => {
        const { page } = await pageFor(375, { storageFailure: true });
        await page
          .getByRole("button", { name: "Find my place", exact: true })
          .click();
        await page.getByRole("button", { name: "Studio", exact: true }).click();
        await page
          .getByRole("button", { name: "Show what I have so far" })
          .click();
        await expect(
          page.getByRole("heading", {
            name: "Closest to what you want",
            exact: true,
          }),
        ).toBeVisible();
        await page.close();
      },
    );
    await t.test(
      "cancelled edits to an applied requirement resume as a draft without changing results",
      async () => {
        const { page } = await pageFor();
        await page
          .getByRole("button", { name: "Find my place", exact: true })
          .click();
        await page.getByRole("button", { name: "Skip", exact: true }).click();
        await page
          .getByRole("button", { name: "Up to $500", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Must have", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Show what I have so far" })
          .click();
        await page
          .getByRole("button", { name: "Ask again", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        await page
          .getByRole("button", { name: "No limit", exact: true })
          .click();
        await page.getByRole("button", { name: "Close guide" }).click();
        assert.equal(
          JSON.parse(await page.getByTestId("state").textContent()).filters
            .maxRentUsd,
          500,
        );
        await page
          .getByRole("button", { name: "Ask again", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        await expect(
          page.getByRole("button", { name: "No limit", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await page.close();
      },
    );
    await t.test(
      "browser history restores URL state rather than the last saved answers",
      async () => {
        const { page } = await pageFor();
        await page
          .getByRole("button", { name: "Find my place", exact: true })
          .click();
        await page.getByRole("button", { name: "Studio", exact: true }).click();
        await page
          .getByRole("button", { name: "Show what I have so far" })
          .click();
        const matchedUrl = page.url();
        await page.evaluate(() => {
          history.pushState({}, "", "/?areas=Verdun");
          window.dispatchEvent(new PopStateEvent("popstate"));
        });
        await expect
          .poll(
            async () =>
              JSON.parse(await page.getByTestId("state").textContent()).filters
                .areas,
          )
          .toEqual(["Verdun"]);
        assert.equal(
          JSON.parse(await page.getByTestId("state").textContent()).prefs,
          null,
        );
        await page.goBack();
        await expect.poll(() => page.url()).toBe(matchedUrl);
        await expect
          .poll(
            async () =>
              JSON.parse(await page.getByTestId("state").textContent()).sort,
          )
          .toBe("match");
        await page.close();
      },
    );
    await t.test(
      "late inventory cannot replace results for newer applied requirements",
      async () => {
        let release;
        const waiting = new Promise((resolve) => {
          release = resolve;
        });
        const { page, requests } = await pageFor(1024, {
          listings: async (route, params) => {
            if (params.maxRentUsd === "300") await waiting;
            const data =
              params.maxRentUsd === "300"
                ? [{ ...rows[2], id: "stale", monthlyRentUsd: 300 }]
                : params.maxRentUsd === "400"
                  ? [{ ...rows[2], id: "current", monthlyRentUsd: 350 }]
                  : rows;
            await route.fulfill({ json: { data } }).catch(() => {});
          },
        });
        try {
          await page
            .getByRole("button", { name: "Find my place", exact: true })
            .click();
          await page.getByRole("button", { name: "Skip", exact: true }).click();
          await page
            .getByRole("button", { name: "Up to $300", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Must have", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Show what I have so far" })
            .click();
          await expect
            .poll(() => requests.some((p) => p.maxRentUsd === "300"))
            .toBe(true);
          await page
            .getByRole("button", { name: "Set manual budget 400" })
            .click();
          await expect(page.getByTestId("result-current")).toBeVisible();
          release();
          await expect(page.getByTestId("result-stale")).toHaveCount(0);
          await expect(page.getByTestId("result-current")).toBeVisible();
        } finally {
          release();
          await page.close();
        }
      },
    );
    await t.test(
      "request failure offers retry without clearing preferences",
      async () => {
        let failed = false;
        const { page } = await pageFor(1024, {
          listings: async (route, params) => {
            if (params.maxRentUsd && !failed) {
              failed = true;
              return route.fulfill({
                status: 500,
                json: { error: "test failure" },
              });
            }
            return route.fulfill({ json: { data: rows } });
          },
        });
        await page
          .getByRole("button", { name: "Find my place", exact: true })
          .click();
        await page.getByRole("button", { name: "Skip", exact: true }).click();
        await page
          .getByRole("button", { name: "Up to $500", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Must have", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Show what I have so far" })
          .click();
        await page.getByRole("button", { name: "Retry inventory" }).click();
        await expect(page.getByTestId("result-best")).toBeVisible();
        assert.equal(
          JSON.parse(await page.getByTestId("state").textContent()).prefs.budget
            .value.max,
          500,
        );
        await page.close();
      },
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
