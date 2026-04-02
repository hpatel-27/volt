import "dotenv/config";
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import routeIndex from "./routes/index.js";

const API_BASE = process.env.API_BASE || "/api/v1";

const app = express();
const port = process.env.SERVER_PORT || 3000;

app.use(express.json());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "development"
        ? ["http://localhost:3000", "http://localhost:5173"]
        : process.env.ALLOWED_ORIGINS?.split(",") || ["https://my-domain.com"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
  // store: ... , // Redis, Memcached, etc. See below.
});
app.use(limiter);

app.use(clerkMiddleware());

app.use(API_BASE, routeIndex);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
