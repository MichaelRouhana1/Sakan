import { z } from "zod";

export const importSavedSchema = z.object({
  listingIds: z.array(z.string().uuid()).min(1).max(100),
});

export type ImportSavedInput = z.infer<typeof importSavedSchema>;
