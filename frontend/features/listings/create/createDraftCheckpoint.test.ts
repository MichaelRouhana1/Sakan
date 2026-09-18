/**
 * Slot-isolation checks for host drafts.
 * Run: npx tsx features/listings/create/createDraftCheckpoint.test.ts
 */
import { INITIAL_DRAFT, type DraftCheckpoint } from "./draft";
import {
  clearDraftSlot,
  draftHasMeaningfulProgress,
  planFreshStart,
  readCheckpoint,
  readWorkingCheckpoint,
  writeCheckpoint,
  writeWorkingCheckpoint,
} from "./createDraftCheckpoint";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const memoryStore = new Map<string, string>();
const memoryLocalStorage = {
  getItem(key: string) {
    return memoryStore.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    memoryStore.set(key, value);
  },
  removeItem(key: string) {
    memoryStore.delete(key);
  },
};
(globalThis as { window?: { localStorage: typeof memoryLocalStorage } }).window =
  { localStorage: memoryLocalStorage };

function checkpoint(
  patch: Partial<DraftCheckpoint["draft"]> = {},
  committedStep = 0,
): DraftCheckpoint {
  return {
    committedStep,
    savedAt: "2026-09-08T12:00:00.000Z",
    draft: { ...INITIAL_DRAFT, title: "Draft listing", ...patch },
  };
}

{
  const main = checkpoint({ title: "Main draft" });
  const working = checkpoint({ title: "Working draft" });
  assert(
    planFreshStart(working, main) === "resume-working",
    "two occupied slots must resume working, not overwrite",
  );
}

{
  const working = checkpoint({ title: "Working draft" });
  assert(
    planFreshStart(working, null) === "fresh",
    "working-only can park then start fresh",
  );
}

{
  const main = checkpoint({ title: "Main draft" });
  assert(
    planFreshStart(null, main) === "fresh",
    "main-only can start a working draft",
  );
}

{
  assert(planFreshStart(null, null) === "fresh", "empty slots start fresh");
}

{
  const empty: DraftCheckpoint = {
    committedStep: -1,
    savedAt: "2026-09-08T12:00:00.000Z",
    draft: { ...INITIAL_DRAFT },
  };
  assert(!draftHasMeaningfulProgress(empty), "empty checkpoint is not progress");
  assert(
    draftHasMeaningfulProgress(checkpoint()),
    "titled committed draft counts as progress",
  );
}

async function assertPublishClearsOnlyActiveSlot() {
  const main = checkpoint({ title: "Keep me" }, 2);
  const working = checkpoint({ title: "Publish me" }, 8);

  await writeCheckpoint(main.draft, main.committedStep);
  await writeWorkingCheckpoint(working.draft, working.committedStep);

  await clearDraftSlot("working");

  const remainingMain = await readCheckpoint();
  const remainingWorking = await readWorkingCheckpoint();
  assert(remainingWorking == null, "published working slot must be cleared");
  assert(
    remainingMain?.draft.title === "Keep me",
    "sibling main draft must survive publishing working",
  );

  await writeWorkingCheckpoint(working.draft, working.committedStep);
  await clearDraftSlot("main");

  const afterMain = await readCheckpoint();
  const afterWorking = await readWorkingCheckpoint();
  assert(afterMain == null, "published main slot must be cleared");
  assert(
    afterWorking?.draft.title === "Publish me",
    "sibling working draft must survive publishing main",
  );
}

void (async () => {
  await assertPublishClearsOnlyActiveSlot();
  for (const cardBadges of [["hl-fiber", "power_24", "water_24"], []]) {
    const draft = { ...INITIAL_DRAFT, step: 9, title: "Badge checkpoint", cardBadges };
    await writeCheckpoint(draft, 8, 9);
    await writeWorkingCheckpoint(draft, 8, 9);
    for (const saved of [await readCheckpoint(), await readWorkingCheckpoint()]) {
      assert(saved?.savedStep === 9, "save and exit must remember step 10");
      assert(JSON.stringify(saved?.draft.cardBadges) === JSON.stringify(cardBadges),
        "badge selection, order and explicit empty arrays must survive save/resume");
    }
  }
  console.log("createDraftCheckpoint.test.ts: ok");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
