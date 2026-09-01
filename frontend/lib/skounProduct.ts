import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const SKOUN_PRODUCT_KEY = "skoun-product";

export type SkounProduct = "housing" | "campus";

export async function setSkounProduct(product: SkounProduct): Promise<void> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(SKOUN_PRODUCT_KEY, product);
  }
  await AsyncStorage.setItem(SKOUN_PRODUCT_KEY, product);
}

export async function getSkounProduct(): Promise<SkounProduct | null> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    const fromWeb = localStorage.getItem(SKOUN_PRODUCT_KEY);
    if (fromWeb === "housing" || fromWeb === "campus") return fromWeb;
  }
  const value = await AsyncStorage.getItem(SKOUN_PRODUCT_KEY);
  if (value === "housing" || value === "campus") return value;
  return null;
}
