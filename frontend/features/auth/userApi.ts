import { api } from "@/lib/api";
import type { User } from "@/types/user";

type ApiErrorBody = {
  error?: { message?: string; code?: string };
};

export class UserApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, opts?: { code?: string; status?: number }) {
    super(message);
    this.name = "UserApiError";
    this.code = opts?.code;
    this.status = opts?.status;
  }
}

function toApiError(err: unknown, fallback: string): UserApiError {
  const axiosErr = err as {
    response?: { status?: number; data?: ApiErrorBody };
    message?: string;
  };
  const message =
    axiosErr.response?.data?.error?.message || axiosErr.message || fallback;
  return new UserApiError(message, {
    code: axiosErr.response?.data?.error?.code,
    status: axiosErr.response?.status,
  });
}

export async function fetchMe(): Promise<User> {
  try {
    const { data } = await api.get<{ data: User }>("/api/users/me");
    return data.data;
  } catch (err) {
    throw toApiError(err, "Could not load your account.");
  }
}
