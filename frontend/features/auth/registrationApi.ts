import { api } from "@/lib/api";
import type { User } from "@/types/user";

type ApiErrorBody = {
  error?: { message?: string; code?: string };
};

export class RegistrationApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, opts?: { code?: string; status?: number }) {
    super(message);
    this.name = "RegistrationApiError";
    this.code = opts?.code;
    this.status = opts?.status;
  }
}

function toApiError(err: unknown, fallback: string): RegistrationApiError {
  const axiosErr = err as {
    response?: { status?: number; data?: ApiErrorBody };
    message?: string;
  };
  const message =
    axiosErr.response?.data?.error?.message || axiosErr.message || fallback;
  return new RegistrationApiError(message, {
    code: axiosErr.response?.data?.error?.code,
    status: axiosErr.response?.status,
  });
}

export type RequestCodeResult = {
  email: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  deliveryMode: "resend" | "smtp" | "outbox";
  deliveryWarning?: string;
  outboxHint?: string;
};

export async function requestRegistrationCode(email: string) {
  try {
    const { data } = await api.post<{ data: RequestCodeResult }>(
      "/api/users/registration/request-code",
      { email },
    );
    return data.data;
  } catch (err) {
    throw toApiError(err, "Could not send verification code.");
  }
}

export async function verifyRegistrationCode(email: string, code: string) {
  try {
    const { data } = await api.post<{
      data: {
        email: string;
        completionToken: string;
        expiresInSeconds: number;
      };
    }>("/api/users/registration/verify-code", { email, code });
    return data.data;
  } catch (err) {
    throw toApiError(err, "Could not verify code.");
  }
}

export async function completeRegistration(input: {
  completionToken: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
  campusId: string;
}) {
  try {
    const { data } = await api.post<{ data: User }>(
      "/api/users/registration/complete",
      { ...input, role: "renter" },
    );
    return data.data;
  } catch (err) {
    throw toApiError(err, "Could not create account.");
  }
}

export async function loginWithPassword(email: string, password: string) {
  try {
    const { data } = await api.post<{ data: User }>("/api/users/login", {
      email,
      password,
    });
    return data.data;
  } catch (err) {
    throw toApiError(err, "Invalid email or password.");
  }
}

export async function syncClerkUser(params: {
  clerkId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<User> {
  try {
    const { data } = await api.post<{ data: User }>("/api/users/sync-clerk", params);
    return data.data;
  } catch (err) {
    throw toApiError(err, "Could not sync user account.");
  }
}

