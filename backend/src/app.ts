import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/error-handler.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { creditsRouter } from "./modules/credits/credits.routes.js";
import { listingsRouter } from "./modules/listings/listings.routes.js";
import { UPLOADS_ROOT } from "./modules/listings/photos.storage.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { roommateRouter } from "./modules/roommate/roommate.routes.js";
import { savedRouter } from "./modules/saved/saved.routes.js";
import { universitiesRouter } from "./modules/universities/universities.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.use("/uploads", express.static(UPLOADS_ROOT, {
    maxAge: "7d",
    fallthrough: true,
  }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "skoun-api" });
  });

  app.use("/api/users", usersRouter);
  app.use("/api/listings", listingsRouter);
  app.use("/api/saved", savedRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/roommate", roommateRouter);
  app.use("/api/universities", universitiesRouter);
  app.use("/api/credits", creditsRouter);
  app.use("/api/admin", adminRouter);

  app.use(errorHandler);

  return app;
}
