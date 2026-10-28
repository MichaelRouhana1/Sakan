import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const STUDENTLY_PRODUCT_KEY = "studently-product";

export type StudentlyProduct = "housing" | "campus";

export async function setStudentlyProduct(product: StudentlyProduct): Promise<void> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(STUDENTLY_PRODUCT_KEY, product);
  }
  await AsyncStorage.setItem(STUDENTLY_PRODUCT_KEY, product);
}

export async function getStudentlyProduct(): Promise<StudentlyProduct | null> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    const fromWeb = localStorage.getItem(STUDENTLY_PRODUCT_KEY);
    if (fromWeb === "housing" || fromWeb === "campus") return fromWeb;
  }
  const value = await AsyncStorage.getItem(STUDENTLY_PRODUCT_KEY);
  if (value === "housing" || value === "campus") return value;
  return null;
}
