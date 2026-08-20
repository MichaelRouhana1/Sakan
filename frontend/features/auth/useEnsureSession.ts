import type { Router } from "expo-router";
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
 * Legacy role switch — prefer shell navigation without changing DB role.
 * Still used if something must force poster in DB before an action.
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

/** Open listing wizard — resumes local main checkpoint if one exists. */
export function openCreateListing(router: Pick<Router, "push">): void {
  router.push({
    pathname: "/(poster)/create",
    params: { new: undefined, working: undefined },
  } as never);
}

/** Open listing wizard from step 0 without loading an existing local checkpoint. */
export function openNewCreateListing(router: Pick<Router, "push">): void {
  router.push({
    pathname: "/(poster)/create",
    params: { new: "1", working: undefined },
  } as never);
}

/** Resume the in-progress "new listing" working draft. */
export function openWorkingCreateListing(router: Pick<Router, "push">): void {
  router.push({
    pathname: "/(poster)/create",
    params: { new: undefined, working: "1" },
  } as never);
}

/** @deprecated Use openCreateListing — host role is granted on first publish. */
export async function enterPosterShell(): Promise<void> {
  await switchToRole("poster");
}
