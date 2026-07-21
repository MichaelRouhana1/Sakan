export const savedKeys = {
  all: ["saved"] as const,
  list: () => [...savedKeys.all, "list"] as const,
  one: (id: string) => [...savedKeys.all, "one", id] as const,
};
