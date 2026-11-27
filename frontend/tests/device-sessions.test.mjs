import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const srcPath = new URL("../features/auth/deviceSessions.ts", import.meta.url);
const tsSource = readFileSync(srcPath, "utf8");
const jsCode = ts.transpileModule(tsSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const mod = await import(
  `data:text/javascript;base64,${Buffer.from(jsCode).toString("base64")}`
);

const {
  getDeviceKind,
  formatDeviceTitle,
  formatSessionLocation,
  formatLastActive,
  formatSessionMeta,
  normalizeDeviceSessions,
  loggedOutToastTitle,
} = mod;

describe("deviceSessions helpers", () => {
  it("classifies phone vs computer from isMobile and deviceType", () => {
    assert.equal(getDeviceKind({ isMobile: true, deviceType: "Windows" }), "phone");
    assert.equal(getDeviceKind({ isMobile: false, deviceType: "iPhone" }), "phone");
    assert.equal(getDeviceKind({ deviceType: "Android" }), "phone");
    assert.equal(getDeviceKind({ isMobile: false, deviceType: "Windows" }), "computer");
    assert.equal(getDeviceKind({ deviceType: "Macintosh" }), "computer");
    assert.equal(getDeviceKind(null), "computer");
  });

  it("formats OS · browser titles with clean fallbacks", () => {
    assert.equal(
      formatDeviceTitle({ deviceType: "Windows", browserName: "Chrome" }),
      "Windows · Chrome",
    );
    assert.equal(
      formatDeviceTitle({ deviceType: "Macintosh", browserName: "Mobile Safari" }),
      "macOS · Safari",
    );
    assert.equal(
      formatDeviceTitle({ deviceType: "iOS", browserName: "CFNetwork" }),
      "iOS",
    );
    assert.equal(
      formatDeviceTitle({ deviceType: "Android", browserName: "okhttp" }),
      "Android",
    );
    assert.equal(
      formatDeviceTitle({ browserName: "Firefox" }),
      "Firefox",
    );
    assert.equal(
      formatDeviceTitle({ isMobile: true }),
      "Mobile device",
    );
    assert.equal(formatDeviceTitle({}), "Unknown device");
  });

  it("formats location cleanly and skips when missing", () => {
    assert.equal(
      formatSessionLocation({ city: "Beirut", country: "Lebanon" }),
      "Beirut, Lebanon",
    );
    assert.equal(
      formatSessionLocation({ city: "", country: "Lebanon" }),
      "Lebanon",
    );
    assert.equal(
      formatSessionLocation({ city: "Beirut", country: null }),
      "Beirut",
    );
    assert.equal(
      formatSessionLocation({ city: "unknown", country: "null" }),
      null,
    );
    assert.equal(formatSessionLocation(null), null);
  });

  it("formats local date at time and combines location · date at time", () => {
    const now = new Date(2026, 10, 27, 17, 0, 0);
    const sameYear = new Date(2026, 10, 27, 14, 30, 0);
    const prevYear = new Date(2025, 4, 10, 9, 5, 0);

    const formattedSame = formatLastActive(sameYear, now, "en-US");
    assert.match(formattedSame, /Nov 27 at 2:30/i);

    const formattedPrev = formatLastActive(prevYear, now, "en-US");
    assert.match(formattedPrev, /May 10, 2025 at 9:05/i);

    const withLoc = formatSessionMeta(
      { city: "Beirut", country: "Lebanon" },
      sameYear,
      now,
      "en-US",
    );
    assert.ok(withLoc.metaLine.startsWith("Beirut, Lebanon · Nov 27 at "));

    const withoutLoc = formatSessionMeta({}, sameYear, now, "en-US");
    assert.ok(!withoutLoc.metaLine.includes("·"));
    assert.ok(withoutLoc.metaLine.startsWith("Nov 27 at "));
  });

  it("sorts current session first, then newest, excludes inactive, and never exposes IP", () => {
    const now = new Date(2026, 10, 27, 18, 0, 0);
    const noop = async () => {};
    const sessions = [
      {
        id: "sess_older",
        status: "active",
        lastActiveAt: new Date(2026, 10, 25, 10, 0, 0),
        latestActivity: {
          deviceType: "Macintosh",
          browserName: "Safari",
          city: "Byblos",
          country: "Lebanon",
          ipAddress: "198.51.100.12",
        },
        revoke: noop,
      },
      {
        id: "sess_current",
        status: "active",
        lastActiveAt: new Date(2026, 10, 26, 10, 0, 0),
        latestActivity: {
          deviceType: "Windows",
          browserName: "Chrome",
          city: "Beirut",
          country: "Lebanon",
          ipAddress: "203.0.113.44",
        },
        revoke: noop,
      },
      {
        id: "sess_newest_other",
        status: "active",
        lastActiveAt: new Date(2026, 10, 27, 17, 30, 0),
        latestActivity: {
          deviceType: "iOS",
          isMobile: true,
          ipAddress: "192.0.2.88",
        },
        revoke: noop,
      },
      {
        id: "sess_revoked",
        status: "revoked",
        lastActiveAt: new Date(2026, 10, 27, 17, 50, 0),
        latestActivity: { deviceType: "Linux", browserName: "Firefox" },
        revoke: noop,
      },
    ];

    const normalized = normalizeDeviceSessions(sessions, "sess_current", now, "en-US");
    assert.deepEqual(
      normalized.map((s) => s.id),
      ["sess_current", "sess_newest_other", "sess_older"],
    );
    assert.equal(normalized[0].isCurrent, true);
    assert.equal(normalized[1].isCurrent, false);
    assert.equal(normalized[1].kind, "phone");
    assert.equal(normalized[1].title, "iOS");

    for (const item of normalized) {
      const serialized = JSON.stringify({
        title: item.title,
        location: item.location,
        metaLine: item.metaLine,
      });
      assert.ok(!serialized.includes("198.51.100.12"));
      assert.ok(!serialized.includes("203.0.113.44"));
      assert.ok(!serialized.includes("192.0.2.88"));
    }

    assert.equal(
      loggedOutToastTitle("Windows · Chrome"),
      "Logged out of Windows · Chrome",
    );
  });
});
