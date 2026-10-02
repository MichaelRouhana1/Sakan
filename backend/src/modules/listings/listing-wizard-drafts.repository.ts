import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  listingWizardDrafts,
  type WizardDraftPayload,
  type WizardDraftSlot,
} from "../../db/schema/listing-wizard-drafts.js";

export type WizardDraftSlots = {
  main: WizardDraftPayload | null;
  working: WizardDraftPayload | null;
};

export class ListingWizardDraftsRepository {
  async listByUser(userId: string): Promise<WizardDraftSlots> {
    const rows = await db
      .select()
      .from(listingWizardDrafts)
      .where(eq(listingWizardDrafts.userId, userId));

    const slots: WizardDraftSlots = { main: null, working: null };
    for (const row of rows) {
      if (row.slot === "main" || row.slot === "working") {
        slots[row.slot] = row.payload;
      }
    }
    return slots;
  }

  /**
   * Keep the checkpoint with the newer savedAt. A slower device must not
   * overwrite progress saved on another one.
   */
  async saveIfNewer(
    userId: string,
    slot: WizardDraftSlot,
    payload: WizardDraftPayload,
  ): Promise<WizardDraftPayload> {
    const savedAt = new Date(payload.savedAt);
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(listingWizardDrafts)
        .where(
          and(
            eq(listingWizardDrafts.userId, userId),
            eq(listingWizardDrafts.slot, slot),
          ),
        )
        .limit(1)
        .for("update");

      if (existing && existing.savedAt.getTime() >= savedAt.getTime()) {
        return existing.payload;
      }

      if (existing) {
        await tx
          .update(listingWizardDrafts)
          .set({ payload, savedAt, updatedAt: new Date() })
          .where(eq(listingWizardDrafts.id, existing.id));
        return payload;
      }

      const inserted = await tx
        .insert(listingWizardDrafts)
        .values({ userId, slot, payload, savedAt })
        .onConflictDoNothing({
          target: [listingWizardDrafts.userId, listingWizardDrafts.slot],
        })
        .returning({ id: listingWizardDrafts.id });

      if (inserted.length > 0) return payload;

      const [raced] = await tx
        .select()
        .from(listingWizardDrafts)
        .where(
          and(
            eq(listingWizardDrafts.userId, userId),
            eq(listingWizardDrafts.slot, slot),
          ),
        )
        .limit(1)
        .for("update");

      if (!raced || raced.savedAt.getTime() < savedAt.getTime()) {
        if (raced) {
          await tx
            .update(listingWizardDrafts)
            .set({ payload, savedAt, updatedAt: new Date() })
            .where(eq(listingWizardDrafts.id, raced.id));
        }
        return payload;
      }
      return raced.payload;
    });
  }

  async remove(userId: string, slot: WizardDraftSlot): Promise<void> {
    await db
      .delete(listingWizardDrafts)
      .where(
        and(
          eq(listingWizardDrafts.userId, userId),
          eq(listingWizardDrafts.slot, slot),
        ),
      );
  }
}

export const listingWizardDraftsRepository = new ListingWizardDraftsRepository();
