import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

/** Physical device: Metro host = dev machine LAN IP. Simulator/web: localhost. */
export function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (Platform.OS !== "web") {
    const debuggerHost =
      Constants.expoGoConfig?.debuggerHost ??
      Constants.expoConfig?.hostUri;
    const host = debuggerHost?.split(":")[0];
    if (host) return `http://${host}:3001`;
  }

  return "http://localhost:3001";
}

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

let authTokenGetter: ((forceRefresh?: boolean) => Promise<string | null>) | null = null;

export function setAuthTokenGetter(
  getter: ((forceRefresh?: boolean) => Promise<string | null>) | null,
): void {
  authTokenGetter = getter;
}

api.interceptors.request.use(async (config) => {
  if ((config as typeof config & { authRetried?: boolean }).authRetried) return config;
  if (authTokenGetter) {
    const token = await authTokenGetter();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return config;
});

function tokenSubject(token: string): string | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '='))).sub ?? null;
  } catch { return null; }
}

api.interceptors.response.use(response => response, async error => {
  const config = error.config;
  const getter = authTokenGetter;
  if (error.response?.status !== 401 || !config || config.authRetried || !getter) throw error;
  const previous = String(config.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const token = await getter(true);
  if (!token || getter !== authTokenGetter) throw error;
  // Never replay one account's pending upload/write under another account.
  if (previous && (!tokenSubject(previous) || tokenSubject(previous) !== tokenSubject(token))) throw error;
  config.authRetried = true;
  config.headers.set('Authorization', `Bearer ${token}`);
  return api.request(config);
});
