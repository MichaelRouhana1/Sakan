import "dotenv/config";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { resolveWhishMode } from "./modules/credits/whish.service.js";

const env = loadEnv();
const app = createApp();

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${env.PORT}`);
  console.log(`Whish Pay: ${resolveWhishMode(env)}`);
  if (env.PUBLIC_BASE_URL) {
    console.log(`Public photo base: ${env.PUBLIC_BASE_URL}`);
  } else {
    console.warn(
      "PUBLIC_BASE_URL is unset — photo URLs will use request Host. Set it to your LAN IP for physical devices.",
    );
  }
  if (env.MAPBOX_ACCESS_TOKEN) {
    console.log("Mapbox Directions: configured (server cache)");
  } else {
    console.warn(
      "MAPBOX_ACCESS_TOKEN is unset — walking routes will fall back to a straight line and will not be cached.",
    );
  }
});
