import Mapbox from "@rnmapbox/maps";
import { getMapboxToken } from "@/lib/mapboxEnv";

const token = getMapboxToken();
if (token) {
  void Mapbox.setAccessToken(token);
}
