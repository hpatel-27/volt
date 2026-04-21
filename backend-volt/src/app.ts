import express from "express";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import routeIndex from "./routes/index.js";
import { requestIdMiddleware } from "./middleware/requestId.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
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
  // Only set rate limiting if set to true
  if (!skipRateLimit) {
    // Rate limiting configuration
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
      standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
      ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
      // store: ... , // Redis, Memcached, etc. See below.
    });
    app.use(limiter);
  }

  app.use(clerkMiddleware());

  app.use(API_BASE, routeIndex);

  // Must be the LAST app.use — Express routes errors to 4-arg middleware
  // only after all other middleware/routes have been checked.
  app.use(errorMiddleware);

  return app;
}
