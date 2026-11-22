import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) {
  throw new Error("Loopback database required");
}

test("draft save and reload keeps the second number as the only primary", async () => {
  const admin = postgres(url, { max: 1 });
  const { createCreationDraft, saveCreationDraft, readCreationDraft } = await import(
    "../src/modules/listings/creation-drafts.service.ts"
  );
  const [owner] = await admin<{ id: string }[]>`INSERT INTO users(role, post_credits) VALUES ('poster', 0) RETURNING id`;
  const id = randomUUID();
  const unitId = randomUUID();
  const payload = {
    version: 2 as const,
    place: { kind: "apartment" as const, data: {}, photos: [] },
    contact: {
      contactNumbers: [
        { id: "a", country: "LB", national: "71123456", calls: true, whatsapp: false, primary: true },
        { id: "b", country: "GB", national: "7400123456", calls: true, whatsapp: false, primary: false },
      ],
    },
    units: [{ id: unitId, data: { photos: [] }, finished: false }],
    position: { screen: "review" as const, unitId },
    completedPlace: [],
    returnTo: null,
    reviewVisited: true,
  };
  try {
    const created = await createCreationDraft(owner.id, { id, payload });
    const numbers = (created.payload.contact as { contactNumbers: { id: string }[] }).contactNumbers;
    const saved = await saveCreationDraft(owner.id, id, {
      payload: {
        ...created.payload,
        contact: {
          contactNumbers: [
            { ...numbers[1], primary: true },
            { ...numbers[0], primary: false },
          ],
        },
      },
      revision: created.revision,
    });
    const loaded = await readCreationDraft(owner.id, id);
    const stored = (loaded.payload.contact as { contactNumbers: { id: string; primary?: boolean }[] }).contactNumbers;
    assert.equal(saved.revision, created.revision + 1);
    assert.equal(stored[0]?.id, "b");
    assert.equal(stored[0]?.primary, true);
    assert.equal(stored[1]?.id, "a");
    assert.equal(stored[1]?.primary, false);
    assert.equal(stored.filter((number) => number.primary).length, 1);
  } finally {
    await admin`DELETE FROM creation_drafts WHERE id = ${id}`;
    await admin`DELETE FROM users WHERE id = ${owner.id}`;
    await admin.end();
  }
});
