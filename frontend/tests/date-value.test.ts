import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWizardDate,
  isoInRange,
  monthHasSelectableDay,
  parseIsoDate,
  todayIsoDate,
} from "../components/listings/create/dateValue.ts";

test("display format stays separate from the stored ISO value", () => {
  assert.equal(formatWizardDate("2026-09-01"), "1 Sep 2026");
  assert.equal(parseIsoDate("2026-09-01")?.d, 1);
  assert.equal(formatWizardDate("2026-02-31"), "");
});

test("past dates fall outside an available-from minimum", () => {
  const today = todayIsoDate(new Date(2026, 10, 21));
  assert.equal(today, "2026-11-21");
  assert.equal(isoInRange("2026-11-20", today), false);
  assert.equal(isoInRange("2026-11-21", today), true);
  assert.equal(isoInRange("2026-12-01", today, "2026-12-15"), true);
  assert.equal(isoInRange("2026-12-16", today, "2026-12-15"), false);
});

test("a month before the minimum cannot be opened", () => {
  assert.equal(monthHasSelectableDay(2026, 10, "2026-11-21"), false);
  assert.equal(monthHasSelectableDay(2026, 11, "2026-11-21"), true);
});
