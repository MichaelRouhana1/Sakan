export const reportKeys = {
  all: ["reports"] as const,
  one: (id: string) => [...reportKeys.all, "one", id] as const,
};
