import "dotenv/config";
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import routeIndex from "./routes/index.js";

const API_BASE = process.env.API_BASE || "/api/v1";

const app = express();
const port = process.env.SERVER_PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

app.use(API_BASE, routeIndex);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
