import { useCallback, useState } from "react";
import type { UserRole } from "@/types/user";

type AuthState = {
  phone: string | null;
  role: UserRole | null;
  userId: string | null;
};

const initial: AuthState = {
  phone: null,
  role: null,
  userId: null,
};

/**
 * Local auth shell until OTP/JWT is wired.
 * Screens can set role after role-select for navigation gating.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>(initial);

  const setPhone = useCallback((phone: string) => {
    setState((s) => ({ ...s, phone }));
  }, []);

  const setRole = useCallback((role: UserRole) => {
    setState((s) => ({ ...s, role }));
  }, []);

  const setUserId = useCallback((userId: string) => {
    setState((s) => ({ ...s, userId }));
  }, []);

  const signOut = useCallback(() => {
    setState(initial);
  }, []);

  return {
    ...state,
    isAuthenticated: Boolean(state.userId),
    setPhone,
    setRole,
    setUserId,
    signOut,
  };
}
