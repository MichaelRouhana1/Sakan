import axios from "axios";
import { getSession } from "@/lib/session";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session) {
    config.headers.set("x-user-id", session.userId);
    config.headers.set("x-user-role", session.role);
  }
  return config;
});
