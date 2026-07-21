import "dotenv/config";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const app = createApp();

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${env.PORT}`);
  if (env.PUBLIC_BASE_URL) {
    console.log(`Public photo base: ${env.PUBLIC_BASE_URL}`);
  } else {
    console.warn(
      "PUBLIC_BASE_URL is unset — photo URLs will use request Host. Set it to your LAN IP for physical devices.",
    );
  }
});
