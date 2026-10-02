/**
 * Run: npx tsx features/listings/create/draftAccountSync.test.ts
 */
import { INITIAL_DRAFT, type DraftCheckpoint } from "./draft";
import { preferNewerDraft } from "./preferNewerDraft";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function checkpoint(savedAt: string, title: string): DraftCheckpoint {
  return {
    committedStep: 1,
    savedAt,
    draft: { ...INITIAL_DRAFT, title },
  };
}

{
  const older = checkpoint("2026-09-01T00:00:00.000Z", "Older");
  const newer = checkpoint("2026-09-02T00:00:00.000Z", "Newer");
  assert(
    preferNewerDraft(older, newer)?.draft.title === "Newer",
    "remote newer than device wins",
  );
  assert(
    preferNewerDraft(newer, older)?.draft.title === "Newer",
    "device newer than remote wins",
  );
  assert(
    preferNewerDraft(older, older)?.draft.title === "Older",
    "equal timestamps keep the device copy",
  );
  assert(preferNewerDraft(older, null)?.draft.title === "Older", "device-only draft stays");
  assert(preferNewerDraft(null, newer)?.draft.title === "Newer", "account-only draft is used");
  assert(preferNewerDraft(null, null) == null, "two empty slots stay empty");
}

console.log("draftAccountSync.test.ts: ok");
