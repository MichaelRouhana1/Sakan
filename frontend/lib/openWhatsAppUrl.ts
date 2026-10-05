import { Linking } from "react-native";

export function openWhatsAppUrl(url: string): Promise<unknown> {
  return Linking.openURL(url);
}
