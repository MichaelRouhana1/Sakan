import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { api } from "@/lib/api";

export type NotificationPreferences = {
  expiryPushEnabled: boolean;
  expiryEmailEnabled: boolean;
};

export function useNotificationPreferences(enabled = true) {
  return useQuery({
    queryKey: ["users", "me", "notification-preferences"],
    queryFn: async () => {
      const { data } = await api.get<{ data: NotificationPreferences }>(
        "/api/users/me/notification-preferences",
      );
      return data.data;
    },
    enabled,
  });
}

export function useUpdateNotificationPreferences() {
  const client = useQueryClient();
  const { refreshUser } = useAuthSession();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      const { data } = await api.patch<{ data: NotificationPreferences }>(
        "/api/users/me/notification-preferences",
        patch,
      );
      return data.data;
    },
    onSuccess: async (data) => {
      client.setQueryData(
        ["users", "me", "notification-preferences"],
        data,
      );
      await refreshUser();
    },
  });
}
