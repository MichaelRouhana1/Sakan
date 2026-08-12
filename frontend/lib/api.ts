import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getSession } from "@/lib/session";

/** Physical device: Metro host = dev machine LAN IP. Simulator/web: localhost. */
function resolveApiBaseUrl(): string {
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

const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

let getClerkToken: (() => Promise<string | null>) | null = null;

export function setClerkTokenGetter(getter: (() => Promise<string | null>) | null) {
  getClerkToken = getter;
}

api.interceptors.request.use(async (config) => {
  if (getClerkToken) {
    try {
      const token = await getClerkToken();
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
      }
    } catch {
      // Fall through to session fallback
    }
  }

  const session = await getSession();
  if (session) {
    config.headers.set("x-user-id", session.userId);
    config.headers.set("x-user-role", session.role);
  }
  return config;
});
