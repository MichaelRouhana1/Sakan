import Mapbox, { hasMapboxNative } from "@/lib/rnmapbox";
import { getMapboxToken } from "@/lib/mapboxEnv";

if (hasMapboxNative()) {
  const token = getMapboxToken();
  if (token) {
    void Mapbox.setAccessToken(token);
  }
}
