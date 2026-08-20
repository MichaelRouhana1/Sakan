import { Redirect } from "expo-router";
import { HOST_LISTINGS_PATH } from "@/constants/hostRoutes";

/** Legacy poster tab index on web → canonical host listings URL. */
export default function PosterDashboardWebRedirect() {
  return <Redirect href={HOST_LISTINGS_PATH} />;
}
