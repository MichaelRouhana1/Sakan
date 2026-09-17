import { rateLimit } from "express-rate-limit";

/** 90 pin taps / 15 min per IP — enough for university browse, tight for scrapers. */
export const WALKING_ROUTE_RATE_LIMIT = 90;
export const WALKING_ROUTE_RATE_WINDOW_MS = 15 * 60 * 1000;

/**
 * In-memory store: fine for a single Hetzner box.
 * Multi-replica needs a shared store later (Redis, etc.).
 */
export const walkingRouteRateLimit = rateLimit({
  windowMs: WALKING_ROUTE_RATE_WINDOW_MS,
  limit: WALKING_ROUTE_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: true,
  // Key is req.ip. Without trust proxy, that is the TCP peer (safe locally).
  // Production behind nginx/Caddy: set TRUST_PROXY=1 so req.ip is the client.
  validate: { xForwardedForHeader: false },
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        message: "Too many walking-route requests. Try again later.",
        code: "RATE_LIMITED",
      },
    });
  },
});
