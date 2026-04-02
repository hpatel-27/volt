import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: env(
      process.env.NODE_ENV === "production"
        ? "DATABASE_URL"
        : "DEV_DATABASE_URL",
    ),
  },
});
