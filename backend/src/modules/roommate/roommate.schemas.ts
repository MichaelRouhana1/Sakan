import { z } from "zod";
import { LEBANON_AREA_SET } from "../../constants/lebanonAreas.js";
import {
  ROOMMATE_INVITE_NOTE_MIN,
  ROOMMATE_LAUNCH_AREA_SET,
} from "../../constants/roommate.js";

const sleepSchedule = z.enum(["early", "flexible", "late"]);
const smoking = z.enum(["no", "outdoors", "yes"]);
const pets = z.enum(["no", "yes"]);
const moveInTiming = z.enum(["asap", "this_month", "flexible"]);

function areasInLaunch(areas: string[], ctx: z.RefinementCtx) {
  if (areas.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pick at least one area",
    });
    return z.NEVER;
  }
  const unknown = areas.filter((a) => !LEBANON_AREA_SET.has(a));
  if (unknown.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unknown area(s): ${unknown.join(", ")}`,
    });
    return z.NEVER;
  }
  const launch = areas.filter((a) => ROOMMATE_LAUNCH_AREA_SET.has(a));
  if (launch.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pick at least one soft-launch area",
    });
    return z.NEVER;
  }
  return launch;
}

export const upsertLookingCardSchema = z
  .object({
    areas: z.array(z.string()).min(1).max(15),
    budgetMaxUsd: z.coerce.number().int().positive().max(10000),
    sleepSchedule,
    smoking,
    pets,
    moveInTiming,
    contactPhone: z.string().min(8).max(32),
    photoUrls: z.array(z.string().min(1)).max(4).default([]),
    status: z.enum(["active", "paused"]).optional(),
  })
  .transform((raw, ctx) => {
    const areas = areasInLaunch(raw.areas, ctx);
    if (areas === z.NEVER) return z.NEVER;
    return { ...raw, areas };
  });

export const createInviteSchema = z.object({
  listingId: z.string().uuid(),
  lookingCardId: z.string().uuid(),
  note: z
    .string()
    .trim()
    .min(ROOMMATE_INVITE_NOTE_MIN, `Note must be at least ${ROOMMATE_INVITE_NOTE_MIN} characters`)
    .max(500),
});

export const reportSchema = z.object({
  targetType: z.enum(["card", "invite", "match", "user"]),
  targetId: z.string().uuid(),
  reason: z.enum(["spam", "harassment", "fake", "other"]),
});

export const blockSchema = z.object({
  blockedUserId: z.string().uuid(),
});

export const endMatchSchema = z.object({
  reason: z.string().max(64).optional(),
});

export const setLookingForRoommateSchema = z.object({
  lookingForRoommate: z.boolean(),
});

export type UpsertLookingCardInput = z.infer<typeof upsertLookingCardSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
