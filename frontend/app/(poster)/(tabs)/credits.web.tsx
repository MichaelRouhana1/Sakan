import { Redirect } from "expo-router";
import { HOST_CREDITS_PATH } from "@/constants/hostRoutes";

/** Legacy poster credits tab on web → canonical host top-up URL. */
export default function PosterCreditsWebRedirect() {
  return <Redirect href={HOST_CREDITS_PATH} />;
}
