import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { getSession, setSession } from "@/lib/session";
import type { User, UserRole } from "@/types/user";

type UserResponse = { data: User };

/** Registers a throwaway account for the chosen role (OTP not wired yet). */
export async function ensureSessionForRole(role: UserRole): Promise<User> {
  const phone = `961${Date.now().toString().slice(-8)}`;
  const { data } = await api.post<UserResponse>("/api/users/register", {
    phone,
    role,
  });
  await setSession({ userId: data.data.id, role: data.data.role });
  // Stub OTP complete → phone verified for Roommate Finder gate
  try {
    await api.post("/api/users/me/verify-phone");
  } catch {
    // register already sets phoneVerifiedAt
  }
  return data.data;
}

/**
 * Switch renter ↔ poster in-app: update DB role + session, clear queries,
 * no full page reload — caller should router.replace to the other shell.
 */
export async function switchToRole(role: UserRole): Promise<User> {
  const session = await getSession();
  if (!session) {
    return ensureSessionForRole(role);
  }

  if (session.role === role) {
    const { data } = await api.get<UserResponse>("/api/users/me");
    return data.data;
  }

  const { data } = await api.patch<UserResponse>("/api/users/me/role", {
    role,
  });
  await setSession({ userId: data.data.id, role: data.data.role });
  queryClient.clear();
  return data.data;
}
