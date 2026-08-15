import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { getSession, setSession } from "@/lib/session";
import type { User, UserRole } from "@/types/user";
import { fetchMe } from "./userApi";

type UserResponse = { data: User };

export class AuthRequiredError extends Error {
  constructor(message = "Sign in required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

/**
 * Switch renter ↔ poster in-app: update DB role + session, clear queries,
 * no full page reload — caller should router.replace to the other shell.
 */
export async function switchToRole(role: UserRole): Promise<User> {
  const session = await getSession();
  if (!session) {
    throw new AuthRequiredError();
  }

  if (session.role === role) {
    return fetchMe();
  }

  const { data } = await api.patch<UserResponse>("/api/users/me/role", {
    role,
  });
  await setSession({ userId: data.data.id, role: data.data.role });
  queryClient.clear();
  return data.data;
}
