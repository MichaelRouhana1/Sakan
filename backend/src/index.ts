import "dotenv/config";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { resolveWhishMode } from "./modules/credits/whish.service.js";

const env = loadEnv();
const app = createApp();

// exclusive: another dev server (Next defaults to 3001 when 3000 is taken)
// must not share this port. On Windows a shared bind accepts connections
// that never reach this API, and the browser times out.
const server = app.listen({ port: env.PORT, host: "0.0.0.0", exclusive: true }, () => {
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

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${env.PORT} is already in use. Stop the other process before starting the API.`,
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
