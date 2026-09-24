import { Platform } from "react-native";
import { hostListingEditPath } from "@/constants/hostRoutes";

export { hostListingEditPath };

type PushRouter = {
  push: (href: never) => void;
};

export function openListingEdit(router: PushRouter, id: string): void {
  if (Platform.OS === "web") {
    router.push(hostListingEditPath(id) as never);
    return;
  }
  router.push({
    pathname: "/(poster)/edit/[id]",
    params: { id },
  } as never);
}
