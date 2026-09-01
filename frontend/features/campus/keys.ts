export const campusKeys = {
  all: ["campus"] as const,
  institutions: () => [...campusKeys.all, "institutions"] as const,
  costs: (programId: string, credits: number, period: string) =>
    [...campusKeys.all, "costs", programId, credits, period] as const,
  housing: (slug: string) => [...campusKeys.all, "housing", slug] as const,
};
