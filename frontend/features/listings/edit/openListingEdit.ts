import { router as expoRouter } from "expo-router";
import { Platform } from "react-native";
import {
  HOST_LISTINGS_PATH,
  hostListingEditPath,
  type HostEditSection,
} from "@/constants/hostRoutes";

export { hostListingEditPath };

type PushRouter = {
  push: (href: never) => void;
};

function onHostListings(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === HOST_LISTINGS_PATH;
}

export function openListingEdit(
  router: PushRouter,
  id: string,
  section?: HostEditSection | null,
): void {
  if (Platform.OS === "web") {
    // Updating the current screen avoids pushing a second listings
    // route that also mounts the edit sheet.
    if (onHostListings()) {
      expoRouter.setParams({ edit: id, section: section ?? "" });
      return;
    }
    router.push(hostListingEditPath(id, section) as never);
    return;
  }
  router.push({
    pathname: "/(poster)/edit/[id]",
    params: section ? { id, section } : { id },
  } as never);
}
