import express from "express";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import routeIndex from "./routes/index.js";
import { requestIdMiddleware } from "./middleware/requestId.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import {
  ipRateLimiter,
  userRateLimiter,
} from "./middleware/rateLimit.middleware.js";
const API_BASE = process.env.API_BASE || "/api/v1";

export function createApp(options?: { skipRateLimit?: boolean }) {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);

  // CORS configuration
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "development"
          ? ["http://localhost:3000", "http://localhost:5173"]
          : process.env.ALLOWED_ORIGINS?.split(",") || [
              "https://my-domain.com",
            ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    }),
  );

  // This could be boolean or undefined
  let skipRateLimit = options?.skipRateLimit;

  app.use(clerkMiddleware());

  // Outer net: IP limiter (skips authenticated user traffic).
  if (!skipRateLimit) {
    app.use(ipRateLimiter);
  }
  // Inner net: per-user limiter (skips unauthenticated traffic).
  if (!skipRateLimit) {
    app.use(userRateLimiter);
  }

  app.use(API_BASE, routeIndex);

  // Must be the LAST app.use — Express routes errors to 4-arg middleware
  // only after all other middleware/routes have been checked.
  app.use(errorMiddleware);

  return app;
}
