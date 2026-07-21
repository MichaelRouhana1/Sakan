export const roommateKeys = {
  all: ["roommate"] as const,
  myCard: () => [...roommateKeys.all, "card", "me"] as const,
  inbox: () => [...roommateKeys.all, "invites", "inbox"] as const,
  sent: () => [...roommateKeys.all, "invites", "sent"] as const,
  seekers: (listingId: string) =>
    [...roommateKeys.all, "seekers", listingId] as const,
  match: (id: string) => [...roommateKeys.all, "match", id] as const,
  nearby: (area: string) => [...roommateKeys.all, "nearby", area] as const,
};
