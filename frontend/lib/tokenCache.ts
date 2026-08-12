import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface TokenCache {
  getToken: (key: string) => Promise<string | null>;
  saveToken: (key: string, value: string) => Promise<void>;
  clearToken?: (key: string) => Promise<void>;
}

const createTokenCache = (): TokenCache => {
  return {
    async getToken(key: string) {
      try {
        if (Platform.OS === "web") {
          return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
        }
        return await SecureStore.getItemAsync(key);
      } catch (err) {
        console.error("SecureStore get item error: ", err);
        return null;
      }
    },
    async saveToken(key: string, value: string) {
      try {
        if (Platform.OS === "web") {
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(key, value);
          }
          return;
        }
        await SecureStore.setItemAsync(key, value);
      } catch (err) {
        console.error("SecureStore save item error: ", err);
      }
    },
    async clearToken(key: string) {
      try {
        if (Platform.OS === "web") {
          if (typeof localStorage !== "undefined") {
            localStorage.removeItem(key);
          }
          return;
        }
        await SecureStore.deleteItemAsync(key);
      } catch (err) {
        console.error("SecureStore clear item error: ", err);
      }
    },
  };
};

export const tokenCache = createTokenCache();
