import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  LookingCard,
  RoommateInviteInboxItem,
  RoommateInviteSentItem,
  SeekerTeaser,
  UnlockedSeeker,
  UpsertLookingCardBody,
} from "@/types/roommate";
import { roommateKeys } from "./keys";

type Envelope<T> = { data: T };

export function useMyLookingCard() {
  return useQuery({
    queryKey: roommateKeys.myCard(),
    queryFn: async () => {
      const { data } = await api.get<Envelope<LookingCard | null>>(
        "/api/roommate/cards/me",
      );
      return data.data;
    },
  });
}

export function useUpsertLookingCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpsertLookingCardBody) => {
      const { data } = await api.post<Envelope<LookingCard>>(
        "/api/roommate/cards",
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: roommateKeys.myCard() });
    },
  });
}

export function usePatchLookingCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<UpsertLookingCardBody> & { status?: "active" | "paused" | "withdrawn" }) => {
      const { data } = await api.patch<Envelope<LookingCard | null>>(
        "/api/roommate/cards/me",
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: roommateKeys.myCard() });
    },
  });
}

export function useRoommateInbox() {
  return useQuery({
    queryKey: roommateKeys.inbox(),
    queryFn: async () => {
      const { data } = await api.get<Envelope<RoommateInviteInboxItem[]>>(
        "/api/roommate/invites",
      );
      return data.data;
    },
  });
}

export function useRoommateSent() {
  return useQuery({
    queryKey: roommateKeys.sent(),
    queryFn: async () => {
      const { data } = await api.get<Envelope<RoommateInviteSentItem[]>>(
        "/api/roommate/invites/sent",
      );
      return data.data;
    },
  });
}

export function useSeekers(listingId: string) {
  return useQuery({
    queryKey: roommateKeys.seekers(listingId),
    enabled: Boolean(listingId),
    queryFn: async () => {
      const { data } = await api.get<Envelope<SeekerTeaser[]>>(
        "/api/roommate/seekers",
        { params: { listingId } },
      );
      return data.data;
    },
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      listingId: string;
      lookingCardId: string;
      note: string;
    }) => {
      const { data } = await api.post("/api/roommate/invites", body);
      return data.data;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: roommateKeys.sent() });
      void qc.invalidateQueries({
        queryKey: roommateKeys.seekers(vars.listingId),
      });
    },
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { data } = await api.post<
        Envelope<{
          match: { id: string };
          listing: {
            id: string;
            area: string;
            whatsappPhone?: string | null;
          } | null;
          seeker: UnlockedSeeker | null;
        }>
      >(`/api/roommate/invites/${inviteId}/accept`);
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: roommateKeys.inbox() });
    },
  });
}

export function useDeclineInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { data } = await api.post(
        `/api/roommate/invites/${inviteId}/decline`,
      );
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: roommateKeys.inbox() });
    },
  });
}

export function useRoommateMatch(matchId: string) {
  return useQuery({
    queryKey: roommateKeys.match(matchId),
    enabled: Boolean(matchId),
    queryFn: async () => {
      const { data } = await api.get(`/api/roommate/matches/${matchId}`);
      return data.data as {
        id: string;
        endedAt: string | null;
        endCopy?: string;
        listing: {
          id: string;
          area: string;
          landmark?: string | null;
          monthlyRentUsd?: number;
          photoUrls?: string[];
          whatsappPhone?: string | null;
        } | null;
        seeker: UnlockedSeeker | null;
      };
    },
  });
}

export function useEndMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { matchId: string; reason?: string }) => {
      const { data } = await api.post(
        `/api/roommate/matches/${vars.matchId}/end`,
        { reason: vars.reason },
      );
      return data.data as { id: string; endCopy: string };
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({
        queryKey: roommateKeys.match(vars.matchId),
      });
    },
  });
}

export function useNearbyRoommateCount(area: string | undefined) {
  return useQuery({
    queryKey: roommateKeys.nearby(area ?? ""),
    enabled: Boolean(area),
    queryFn: async () => {
      const { data } = await api.get<
        Envelope<{ count: number; area: string; inLaunch: boolean }>
      >("/api/roommate/stats/nearby", { params: { area } });
      return data.data;
    },
  });
}

export function useSetGender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (gender: "male" | "female") => {
      const { data } = await api.patch("/api/users/me/gender", { gender });
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
}

export function useVerifyPhone() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/users/me/verify-phone");
      return data.data;
    },
  });
}

export function useSetLookingForRoommate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      listingId: string;
      lookingForRoommate: boolean;
    }) => {
      const { data } = await api.patch(
        `/api/listings/${vars.listingId}/looking-for-roommate`,
        { lookingForRoommate: vars.lookingForRoommate },
      );
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

export function useArchiveListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      const { data } = await api.post(`/api/listings/${listingId}/archive`);
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

export function useReportRoommate() {
  return useMutation({
    mutationFn: async (body: {
      targetType: "card" | "invite" | "match" | "user";
      targetId: string;
      reason: "spam" | "harassment" | "fake" | "other";
    }) => {
      const { data } = await api.post("/api/roommate/reports", body);
      return data.data;
    },
  });
}

export function useBlockUser() {
  return useMutation({
    mutationFn: async (blockedUserId: string) => {
      const { data } = await api.post("/api/roommate/blocks", {
        blockedUserId,
      });
      return data.data;
    },
  });
}
