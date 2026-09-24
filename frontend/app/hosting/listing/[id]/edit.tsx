import {
  Redirect,
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
} from "expo-router";
import { Platform } from "react-native";
import { hostListingEditPath } from "@/constants/hostRoutes";

function firstParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  return value?.[0] ?? "";
}

function listingIdFromPath(pathname: string): string {
  const match = pathname.match(/\/listing\/([^/]+)\/edit\/?$/);
  return match?.[1] ?? "";
}

export default function HostListingEditRoute() {
  const pathname = usePathname();
  const local = useLocalSearchParams<{ id: string }>();
  const global = useGlobalSearchParams<{ id: string }>();
  const listingId =
    firstParam(local.id) ||
    firstParam(global.id) ||
    listingIdFromPath(pathname);

  if (Platform.OS !== "web") {
    return (
      <Redirect
        href={
          listingId
            ? (`/(poster)/edit/${listingId}` as never)
            : ("/(poster)/(tabs)" as never)
        }
      />
    );
  }

  return (
    <Redirect
      href={(listingId ? hostListingEditPath(listingId) : "/hosting/listing") as never}
    />
  );
}
