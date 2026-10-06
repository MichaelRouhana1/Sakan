import test from "node:test";
import assert from "node:assert/strict";
import { build } from "../../backend/node_modules/esbuild/lib/main.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
const frontend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const bundle = await build({
  stdin: {
    contents: `export * from './features/listings/create/draft'; export * from './features/listings/create/mapDraftToBody'; export * from './features/listings/edit/mapListingToDraft'; export * from './features/listings/create/previewListingFromDraft'; export * from './features/listings/create/validators'; export * from './lib/listingPhotoFrames';`,
    resolveDir: frontend,
    loader: "ts",
  },
  absWorkingDir: frontend,
  external: ["@expo/vector-icons"],
  plugins: [
    {
      name: "test-api-origin",
      setup(build) {
        build.onResolve({ filter: /^lucide-react-native$/ }, () => ({
          path: "icons",
          namespace: "icons",
        }));
        build.onLoad({ filter: /.*/, namespace: "icons" }, () => ({
          contents:
            "export const ArrowUpDown=null,BatteryCharging=null,Droplets=null,Footprints=null,Globe=null,GraduationCap=null,Lightbulb=null,MapPin=null,Paintbrush=null,Shield=null,ShowerHead=null,Sparkles=null,Sun=null,UserRound=null,Users=null,VolumeOff=null,Wifi=null,Zap=null;",
          loader: "js",
        }));
        build.onResolve({ filter: /^@\/lib\/api$/ }, () => ({
          path: "api",
          namespace: "test",
        }));
        build.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: 'export const API_BASE_URL="https://api.test";',
          loader: "js",
        }));
      },
    },
  ],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const m = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`
);
const photo = (id, caption, status = "ready") => ({
  localId: id,
  uri: `https://photos.test/${id}`,
  url: `https://photos.test/${id}`,
  caption,
  status,
});
test("create/edit caption roundtrip preserves photo identity, order and empty values", () => {
  const draft = {
    ...m.INITIAL_DRAFT,
    spaceType: "entire_place",
    propertyType: "apartment",
    photos: [
      photo("third", "  washing machine  "),
      photo("first", "   "),
      photo("second", "Sofa bed sleeps 2"),
      photo("error", "Do not submit", "error"),
    ],
  };
  const body = m.mapDraftToBody(draft);
  assert.deepEqual(body.photoCaptions, [
    "washing machine",
    "",
    "Sofa bed sleeps 2",
  ]);
  assert.deepEqual(
    body.photoUrls,
    ["third", "first", "second"].map((id) => `https://photos.test/${id}`),
  );
  const restored = m.mapListingToDraft(m.previewListingFromDraft(draft));
  assert.deepEqual(
    m.mapDraftToBody(restored).photoCaptions,
    body.photoCaptions,
  );
  assert.deepEqual(m.mapDraftToBody(restored).photoUrls, body.photoUrls);
  restored.photos.splice(1, 1);
  assert.deepEqual(m.mapDraftToBody(restored).photoCaptions, [
    "washing machine",
    "Sofa bed sleeps 2",
  ]);
});
test("photo publish guard still requires three completed uploads", () => {
  for (const count of [0, 1, 2])
    assert.ok(
      m
        .stepFieldErrors(
          {
            ...m.INITIAL_DRAFT,
            photos: Array.from({ length: count }, (_, i) =>
              photo(String(i), ""),
            ),
          },
          5,
        )
        .includes("photos"),
    );
  assert.deepEqual(
    m.stepFieldErrors(
      {
        ...m.INITIAL_DRAFT,
        photos: [photo("1", ""), photo("2", ""), photo("3", "")],
      },
      5,
    ),
    [],
  );
  assert.ok(
    m
      .stepFieldErrors(
        {
          ...m.INITIAL_DRAFT,
          photos: [photo("1", ""), photo("2", ""), photo("3", "", "uploading")],
        },
        5,
      )
      .includes("photos"),
  );
});
test("production frame rules preserve native narrow card and responsive detail geometry", () => {
  assert.equal(m.SEARCH_PHOTO_ASPECT, 1.6);
  assert.equal(
    m.cardPhotoHeight(
      m.NATIVE_CARD_PHOTO_WIDTH,
      m.NATIVE_CARD_PHOTO_MIN_HEIGHT,
    ),
    168,
  );
  assert.deepEqual(m.detailPhotoFrame(1440, 1100, false, 3), {
    width: 660,
    height: 400,
  });
  assert.deepEqual(m.detailPhotoFrame(390, 844, true, 3), {
    width: 390,
    height: 371,
  });
  assert.deepEqual(m.detailPhotoFrame(390, 844, false, 3), {
    width: 390,
    height: 371,
  });
});

test("scrollbar width never changes the detail route breakpoint", () => {
  assert.deepEqual(m.detailPhotoFrame(905, 900, false, 3, 890), {
    width: 110,
    height: 400,
  });
});
