import "dotenv/config";
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
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

app.use(clerkMiddleware());

app.use(API_BASE, routeIndex);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
