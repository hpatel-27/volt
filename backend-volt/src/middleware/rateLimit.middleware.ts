import { rateLimit } from "express-rate-limit";
import { getAuth } from "@clerk/express";

/**
 * Global IP-based limiter. Runs BEFORE Clerk, so it has no auth context.
 * This is the outer net against anonymous, opportunistic bot traffic.
 * Keys on the (subnet-masked) client IP by default.
 * Note: if i wanted to protect against rotating IP malicious attacks
 * I'd have to put something like cloudflare in front of the app to absorb that traffic
 */
export const ipRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
  // Mirror of the user limiter's skip by bypassing this IP limiter
  // for authenticated requests so they're governed purely by the per-user limiter.
  skip: (req) => {
    const { userId } = getAuth(req);
    // convert to boolean, then flip again
    return !!userId;
  },
});

/**
 * Per-user limiter. Runs AFTER clerkMiddleware so `getAuth(req)` is populated.
 * Gives each authenticated account its own budget, independent of IP - this is
 * what protects family/friends who share a home router or CGNAT from collectively
 * exhausting the IP limit above.
 */
export const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // A logged-in user gets a more generous budget than an anonymous IP.
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => {
    const { userId } = getAuth(req);
    return !userId;
  },

  // we only need to handle the authenticated user case here
  // the ip rate limit handles the non authenticated users
  keyGenerator: (req) => {
    const { userId } = getAuth(req);
    return `user:${userId}`;
  },
});
