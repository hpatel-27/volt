import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

if (
  !process.env.DATABASE_URL ||
  !process.env.DEV_DATABASE_URL ||
  !process.env.TEST_DATABASE_URL
) {
  throw new Error("DATABASE_URLs are not defined");
}

let DATABASE_URL;
if (process.env.NODE_ENV === "production") {
  DATABASE_URL = process.env.DATABASE_URL;
} else if (process.env.NODE_ENV === "development") {
  DATABASE_URL = process.env.DEV_DATABASE_URL;
} else if (process.env.NODE_ENV === "test") {
  DATABASE_URL = process.env.TEST_DATABASE_URL;
}

const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });
