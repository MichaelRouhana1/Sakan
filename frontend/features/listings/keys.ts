export const listingKeys = {
  all: ["listings"] as const,
  lists: () => [...listingKeys.all, "list"] as const,
  list: (filters: { area?: string; universitySlug?: string }) =>
    [...listingKeys.lists(), filters] as const,
  details: () => [...listingKeys.all, "detail"] as const,
  detail: (id: string) => [...listingKeys.details(), id] as const,
};
