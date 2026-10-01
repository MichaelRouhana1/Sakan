import { Redirect } from "expo-router";
import { HOST_ANALYTICS_PATH } from "@/constants/hostRoutes";

/** Poster analytics tab on web → canonical host analytics URL. */
export default function PosterAnalyticsWebRedirect() {
  return <Redirect href={HOST_ANALYTICS_PATH} />;
}
