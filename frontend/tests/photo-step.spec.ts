import { test, expect, type Page } from "@playwright/test";
import {
  INITIAL_DRAFT,
  CREATE_DRAFT_CHECKPOINT_KEY,
} from "../features/listings/create/draft";
async function setup(page: Page, count = 3, step = 5) {
  const draft = {
    ...INITIAL_DRAFT,
    step,
    spaceType: "entire_place",
    propertyType: "studio",
    area: "Mar Mikhael",
    pin: { ...INITIAL_DRAFT.pin, confirmed: true },
    primaryCampusId: "test-campus",
    furnishingType: "furnished",
    electricity: "solar",
    water: "state_well_24_7",
    routerUps: true,
    targetAudience: "students_professionals",
    monthlyRentUsd: "720",
    title: "Mar Mikhael loft-style studio",
    description: "A bright furnished studio close to campus and local shops.",
    listingPosterRole: "landlord",
    contactName: "Test host",
    contactNumbers: [
      {
        kind: "mobile",
        prefix: "71",
        subscriber: "123456",
        calls: true,
        whatsapp: true,
      },
    ],
    amenities: [
      "study_desk",
      "water_heater_electric",
      "parking",
      "washer",
      "balcony",
      "ac_all_rooms",
    ],
    highlightTags: [
      "walk_to_campus",
      "power_24_7",
      "fiber",
      "quiet_area",
      "newly_renovated",
    ],
    cardBadges: null,
    photos: Array.from({ length: count }, (_, i) => i).map((i) => ({
      localId: `photo-${i}`,
      status: "ready",
      uri: `https://badge-test.invalid/photo-${i}.jpg`,
      url: `https://badge-test.invalid/photo-${i}.jpg`,
    })),
  };
  await page.route("**/api/**", (route) =>
    route.fulfill({
      json: {
        data: route.request().url().endsWith("/users/me")
          ? { postCredits: 2, boostCredits: 0 }
          : [],
      },
    }),
  );
  await page.route("https://badge-test.invalid/**", (route) =>
    process.env.SKOUN_TEST_PHOTO
      ? route.fulfill({
          path: process.env.SKOUN_TEST_PHOTO,
          contentType: "image/jpeg",
        })
      : route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#dfdad2"/><rect x="460" y="30" width="220" height="320" fill="#b5c9cb"/><path d="M570 30V350M460 190H680" stroke="#fff" stroke-width="12"/><rect x="50" y="270" width="330" height="140" rx="25" fill="#8e9681"/><rect x="80" y="400" width="20" height="40" fill="#514e45"/><rect x="330" y="400" width="20" height="40" fill="#514e45"/></svg>',
        }),
  );
  await page.addInitScript(
    ({ key, value }) => {
      if (!sessionStorage.getItem("badge-test-seeded")) {
        localStorage.setItem(key, JSON.stringify(value));
        sessionStorage.setItem("badge-test-seeded", "1");
      }
    },
    {
      key: CREATE_DRAFT_CHECKPOINT_KEY,
      value: {
        draft,
        committedStep: 8,
        savedStep: step,
        savedAt: new Date().toISOString(),
      },
    },
  );
  await page.goto("/create");
  await expect(
    page.getByRole("button", { name: "Save and exit" }),
  ).toBeVisible();
}

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"><rect width="800" height="1200" fill="#F1D672"/><rect x="0" width="200" height="1200" fill="#DC6754"/><rect x="600" width="200" height="1200" fill="#467CAB"/><rect y="500" width="800" height="100" fill="#456957"/><circle cx="400" cy="350" r="80" fill="#CBBFE4"/></svg>';
async function drop(page: Page, names: string[]) {
  const transfer = await page.evaluateHandle(
    ({ names, svg }) => {
      const data = new DataTransfer();
      names.forEach((name) =>
        data.items.add(
          new File([name.includes("bad") ? "broken" : svg], name, {
            type: "image/svg+xml",
          }),
        ),
      );
      return data;
    },
    { names, svg },
  );
  await page
    .locator("[data-photo-drop]")
    .dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
}
const dialog = (page: Page) =>
  page.getByRole("dialog", { name: "Crop photos" });
async function uploads(page: Page, failFirst = false) {
  const received: Buffer[] = [];
  await page.route("**/api/listings/photos", async (route) => {
    const body = route.request().postDataBuffer()!;
    const start = body.indexOf(Buffer.from([255, 216, 255]));
    const end = body.lastIndexOf(Buffer.from([255, 217]));
    received.push(body.subarray(start, end + 2));
    if (failFirst && received.length === 1) {
      await route.fulfill({
        status: 500,
        json: { error: { message: "Test upload failed" } },
      });
      return;
    }
    const uri = "data:image/jpeg;base64," + received.at(-1)!.toString("base64");
    await route.fulfill({
      json: { data: { urls: [uri], photos: [{ url: uri, sortOrder: 0 }] } },
    });
  });
  return received;
}
test("FIFO drop, live crop, Skip then X keeps saved; captions persist and do not drag", async ({
  page,
}, info) => {
  await setup(page);
  const received = await uploads(page);
  await drop(page, ["one.svg", "two.svg", "three.svg"]);
  await expect(dialog(page).getByText("Crop 1/3")).toBeVisible();
  await expect(
    dialog(page).getByRole("heading", { name: "Crop 1 of 3", exact: true }),
  ).toBeVisible();
  const before = await page.getByTestId("crop-preview-card").screenshot();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(async () =>
      (await page.getByTestId("crop-preview-card").screenshot()).equals(before),
    )
    .toBe(false);
  await page.screenshot({ path: info.outputPath("crop-desktop.png") });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog(page).getByText("Crop 2/3")).toBeVisible();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(dialog(page).getByText("Crop 3/3")).toBeVisible();
  await page.getByRole("button", { name: "Close crop batch", exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect.poll(() => received.length).toBe(1);
  await expect(
    page.getByLabel("Caption for photo 4", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Caption for photo 4", { exact: true })
    .fill("  Sofa bed sleeps 2  ");
  await page.getByText("Photos of the place", { exact: true }).click();
  await expect(
    page.getByLabel("Caption for photo 4", { exact: true }),
  ).toHaveValue("Sofa bed sleeps 2");
  await expect(page.locator("[data-photo-tile]")).toHaveCount(4);
  await page.getByRole("button", { name: "Save and exit" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key)!).draft.photos.at(-1).caption,
        CREATE_DRAFT_CHECKPOINT_KEY,
      ),
    )
    .toBe("Sofa bed sleeps 2");
  await page.goto("/create");
  await expect(
    page.getByLabel("Caption for photo 4", { exact: true }),
  ).toHaveValue("Sofa bed sleeps 2");
});
test("Save then Save uploads both crops and closes the batch", async ({ page }) => {
  await setup(page);
  const received = await uploads(page);
  await drop(page, ["one.svg", "two.svg"]);
  await expect(dialog(page).getByText("Crop 1/2")).toBeVisible();
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog(page).getByText("Crop 2/2")).toBeVisible();
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect.poll(() => received.length).toBe(2);
  await expect(page.locator("[data-photo-tile]")).toHaveCount(5);
});

for (const close of ["X", "Escape", "backdrop"] as const)
  test(`${close} mid-batch keeps saved crops and discards current plus remainder`, async ({
    page,
  }) => {
    await setup(page);
    const received = await uploads(page);
    await drop(page, ["one.svg", "two.svg", "three.svg"]);
    await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog(page).getByText("Crop 2/3")).toBeVisible();
    if (close === "Escape") await page.keyboard.press("Escape");
    else if (close === "backdrop")
      await page.getByTestId("crop-backdrop").click({ position: { x: 5, y: 5 } });
    else
      await dialog(page)
        .getByRole("button", { name: "Close crop batch" })
        .click();
    await expect(dialog(page)).toHaveCount(0);
    await expect.poll(() => received.length).toBe(1);
    await expect(page.locator("[data-photo-tile]")).toHaveCount(4);
    // Reopening proves the remaining files were discarded and intake unlocked.
    await drop(page, ["fresh.svg"]);
    await expect(dialog(page).getByText("Crop 1/1")).toBeVisible();
    await dialog(page).getByRole("button", { name: "Skip", exact: true }).click();
    await expect(dialog(page)).toHaveCount(0);
    expect(received.length).toBe(1);
  });

for (const action of ["Skip", "Close crop batch", "Save"])
  test(`single photo: ${action} closes with ${action === "Save" ? "one" : "no"} upload`, async ({
    page,
  }) => {
    await setup(page);
    const received = await uploads(page);
    await drop(page, ["one.svg"]);
    await expect(dialog(page).getByText("Crop 1/1")).toBeVisible();
    await expect(dialog(page).getByText("Finish batch")).toHaveCount(0);
    await dialog(page).getByRole("button", { name: action, exact: true }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect.poll(() => received.length).toBe(action === "Save" ? 1 : 0);
    await expect(page.locator("[data-photo-tile]")).toHaveCount(
      action === "Save" ? 4 : 3,
    );
  });

test("overflow, failed decoding and Escape discard remainder without upload", async ({
  page,
}) => {
  await setup(page, 13);
  const received = await uploads(page);
  await drop(page, ["bad.svg", "good.svg", "overflow.svg"]);
  await expect(dialog(page).getByText("Crop 2/2")).toBeVisible();
  await expect(dialog(page).getByText(/only 2 slots remained/)).toBeVisible();
  await expect(dialog(page).getByText(/bad.svg.*Skipped/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  expect(received.length).toBe(0);
  await expect(page.locator("[data-photo-tile]")).toHaveCount(13);
});
test("multi-select, focus containment and return, retry does not crop again", async ({
  page,
}) => {
  await setup(page);
  const received = await uploads(page, true);
  const add = page.getByRole("button", { name: /Add photos, / });
  await add.focus();
  const choosing = page.waitForEvent("filechooser");
  await add.click();
  await (
    await choosing
  ).setFiles([
    { name: "one.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svg) },
    { name: "two.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svg) },
  ]);
  await expect(dialog(page).getByText("Crop 1/2")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close crop batch", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Save", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog(page).getByText("Crop 2/2")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(add).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Retry photo upload" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry photo upload" }).click();
  await expect.poll(() => received.length).toBe(2);
  await expect(
    page.getByRole("button", { name: "Retry photo upload" }),
  ).toHaveCount(0);
  await expect(dialog(page)).toHaveCount(0);
});
test("mobile layout fits and preserves three-photo minimum", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, 0);
  await uploads(page);
  await expect(
    page.getByText("Add at least 3 photos to publish."),
  ).toBeVisible();
  await drop(page, ["portrait.svg"]);
  await expect(dialog(page)).toBeVisible();
  await expect(page.getByTestId("photo-cropper")).toBeVisible();
  await expect(
    dialog(page).getByRole("button", { name: "Save", exact: true }),
  ).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({ path: info.outputPath("crop-mobile.png") });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(
    page.getByText("Add at least 3 photos to publish."),
  ).toBeVisible();
});

// Compare actual pixels of the live preview to the exported JPEG in production image slots.
// Ignore rounded corners/chrome and use a small tolerance for the existing JPEG compressor.
const { PNG } = require("pngjs");
function expectSameImage(preview: Buffer, displayed: Buffer) {
  const a = PNG.sync.read(preview),
    b = PNG.sync.read(displayed);
  let error = 0,
    samples = 0;
  for (let y = 12; y < 88; y += 2)
    for (let x = 12; x < 88; x += 2) {
      if (x > 72 && y < 30) continue; // Save/heart chrome in the real search card.
      const ai =
        (Math.floor((y * a.height) / 100) * a.width +
          Math.floor((x * a.width) / 100)) *
        4;
      // Element screenshots round fractional CSS bounds to pixels. Permit one raster pixel,
      // not a different crop, and keep the JPEG color tolerance below 5/255 per channel.
      let best = Infinity;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const bi =
            ((Math.floor((y * b.height) / 100) + dy) * b.width +
              Math.floor((x * b.width) / 100) +
              dx) *
            4;
          let delta = 0;
          for (let c = 0; c < 3; c++)
            delta += Math.abs(a.data[ai + c] - b.data[bi + c]);
          best = Math.min(best, delta);
        }
      error += best;
      samples += 3;
    }
  expect(error / samples).toBeLessThan(5);
}
for (const viewport of [
  { width: 1440, height: 1100 },
  { width: 390, height: 844 },
])
  test(`exported crop matches real ${viewport.width}px hero and gallery captions`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await setup(page);
    const received = await uploads(page);
    await drop(page, ["one.svg"]);
    await expect(dialog(page)).toBeVisible();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page
      .getByTestId("photo-cropper")
      .locator(".reactEasyCrop_Container")
      .focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const heroPreview = page.getByTestId("crop-preview-detail");
    const previewBox = await heroPreview.boundingBox();
    const preview = await heroPreview.screenshot();
    const cardPreview = await page
      .getByTestId("crop-preview-card")
      .screenshot({ path: info.outputPath("preview-card.png") });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => received.length).toBe(1);
    await expect(page.getByText(/4 ready/)).toBeVisible();
    const image = "data:image/jpeg;base64," + received[0].toString("base64");
    const listing = {
      id: "crop-parity",
      posterId: "test",
      status: "active",
      availability: "available",
      listingType: "studio",
      title: "Crop parity home",
      area: "Hamra",
      monthlyRentUsd: 650,
      contactName: "Host",
      listingPosterRole: "landlord",
      targetAudience: "students_professionals",
      description: "Test listing.",
      amenities: [],
      createdAt: "2026-10-01",
      photos: [0, 1, 2].map((i) => ({
        id: String(i),
        url: image,
        sortOrder: i,
        caption: i === 0 ? "Sofa bed sleeps 2" : null,
      })),
    };
    await page.route("**/api/listings/crop-parity", (route) =>
      route.fulfill({ json: { data: listing } }),
    );
    // The review grid is the real search card component, using the exported upload.
    await page.getByRole("button", { name: "Save and exit" }).click();
    await page.evaluate(
      ({ key, image }) => {
        const checkpoint = JSON.parse(localStorage.getItem(key)!);
        checkpoint.draft.photos.forEach((p: { uri: string; url: string }) => {
          p.uri = image;
          p.url = image;
        });
        checkpoint.savedStep = 9;
        checkpoint.draft.step = 9;
        localStorage.setItem(key, JSON.stringify(checkpoint));
      },
      { key: CREATE_DRAFT_CHECKPOINT_KEY, image },
    );
    await page.goto("/create");
    const gridMedia = page
      .getByTestId("grid-card-preview")
      .getByTestId("listing-grid-media");
    await expect(gridMedia).toBeVisible();
    await expect
      .poll(() =>
        gridMedia
          .locator("img")
          .first()
          .evaluate((img: HTMLImageElement) => img.complete),
      )
      .toBe(true);
    await info.attach("preview-card", {
      body: cardPreview,
      contentType: "image/png",
    });
    const actualCard = await gridMedia
      .locator("[data-expoimage]")
      .first()
      .screenshot({ path: info.outputPath("actual-card.png") });
    await info.attach("actual-card", {
      body: actualCard,
      contentType: "image/png",
    });
    expectSameImage(cardPreview, actualCard);
    await page.goto("/listing/crop-parity");
    const hero = page.getByTestId("detail-hero-image").first();
    await expect(hero).toBeVisible();
    await expect
      .poll(() =>
        hero.locator("img").evaluate((img: HTMLImageElement) => img.complete),
      )
      .toBe(true);
    const actual = await hero.boundingBox();
    expect(actual!.width / actual!.height).toBeCloseTo(
      previewBox!.width / previewBox!.height,
      2,
    );
    // Screenshot the image node (gallery chrome is a sibling, below the image).
    const displayed = await hero.screenshot();
    if (viewport.width >= 900) expectSameImage(preview, displayed);
    else {
      // Mobile production overlays a gradient. Compare underlying image pixels using its real slot.
      const screenshot = await hero.evaluate(async (el) => {
        const img = el.querySelector("img")!;
        const frame = el.getBoundingClientRect();
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(frame.width);
        canvas.height = Math.round(frame.height);
        const ctx = canvas.getContext("2d")!;
        const scale = Math.max(
          frame.width / img.naturalWidth,
          frame.height / img.naturalHeight,
        );
        ctx.drawImage(
          img,
          (frame.width - img.naturalWidth * scale) / 2,
          (frame.height - img.naturalHeight * scale) / 2,
          img.naturalWidth * scale,
          img.naturalHeight * scale,
        );
        return canvas.toDataURL();
      });
      expectSameImage(preview, Buffer.from(screenshot.split(",")[1], "base64"));
    }
    await expect(page.getByTestId("gallery-caption")).toHaveText(
      "Sofa bed sleeps 2",
    );
    if (viewport.width >= 900) {
      await page
        .getByRole("button", { name: "Open photos", exact: true })
        .click();
      await expect(page.getByTestId("lightbox-caption")).toHaveText(
        "Sofa bed sleeps 2",
      );
    }
    await page.screenshot({ path: info.outputPath("real-gallery.png") });
  });

test("EXIF portrait is normalized before preview and export", async ({
  page,
}) => {
  await setup(page);
  const received = await uploads(page);
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 600, 800);
    ctx.fillStyle = "#0000ff";
    ctx.fillRect(600, 0, 600, 800);
    const jpeg = await new Promise<Blob>((resolve) =>
      canvas.toBlob((value) => resolve(value!), "image/jpeg", 1),
    );
    // JPEG APP1: little-endian EXIF orientation=6 (90 degrees clockwise).
    const exif = new Uint8Array([
      255, 225, 0, 34, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0, 1, 0,
      18, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const rotated = new File(
      [jpeg.slice(0, 2), exif, jpeg.slice(2)],
      "portrait-exif.jpg",
      { type: "image/jpeg" },
    );
    const data = new DataTransfer();
    data.items.add(rotated);
    document
      .querySelector("[data-photo-drop]")!
      .dispatchEvent(
        new DragEvent("drop", { bubbles: true, dataTransfer: data }),
      );
  });
  const image = page.getByTestId("crop-preview-card").locator("img");
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((img: HTMLImageElement) => [
        img.naturalWidth,
        img.naturalHeight,
      ]),
    )
    .toEqual([800, 1200]);
  const colors = await image.evaluate((img: HTMLImageElement) => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 1200;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    return [
      Array.from(ctx.getImageData(400, 100, 1, 1).data),
      Array.from(ctx.getImageData(400, 1100, 1, 1).data),
    ];
  });
  expect(colors[0][0]).toBeGreaterThan(245);
  expect(colors[1][2]).toBeGreaterThan(245);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => received.length).toBe(1);
  const exported = await page.evaluate(
    async (uri) => {
      const img = new Image();
      img.src = uri;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    },
    "data:image/jpeg;base64," + received[0].toString("base64"),
  );
  expect(exported).toEqual([1600, 1000]);
});
test("captions follow reorder and deletion; full gallery drop gives a notice", async ({
  page,
}) => {
  await setup(page, 15);
  await page
    .getByLabel("Caption for photo 1", { exact: true })
    .fill("First photo");
  await page
    .getByLabel("Caption for photo 2", { exact: true })
    .fill("Second photo");
  const first = await page.locator("[data-photo-tile]").nth(0).boundingBox();
  const second = await page.locator("[data-photo-tile]").nth(1).boundingBox();
  await page.mouse.move(second!.x + second!.width / 2, second!.y + 30);
  await page.mouse.down();
  await page.mouse.move(first!.x + first!.width / 2, first!.y + 30, {
    steps: 10,
  });
  await page.mouse.up();
  await expect(
    page.getByLabel("Caption for photo 1", { exact: true }),
  ).toHaveValue("Second photo");
  await expect(
    page.getByLabel("Caption for photo 2", { exact: true }),
  ).toHaveValue("First photo");
  await drop(page, ["extra.svg"]);
  await expect(page.getByText(/all 15 slots are in use/)).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Remove photo", exact: true })
    .first()
    .click();
  await expect(
    page.getByLabel("Caption for photo 1", { exact: true }),
  ).toHaveValue("First photo");
  await expect(page.locator("[data-photo-tile]")).toHaveCount(14);
});
