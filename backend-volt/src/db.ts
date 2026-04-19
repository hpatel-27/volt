import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.NODE_ENV) {
  throw new Error(
    "NODE_ENV is not defined. This must be set before the program can run.",
  );
}
const NODE_ENV = process.env.NODE_ENV;

let DATABASE_URL;
if (NODE_ENV === "production") {
  if (!process.env.DATABASE_URL) {
    throw new Error("You must set the DATABASE_URL env variable.");
  }
  DATABASE_URL = process.env.DATABASE_URL;
} else if (NODE_ENV === "development") {
  if (!process.env.DEV_DATABASE_URL) {
    throw new Error("You must set the DEV_DATABASE_URL env variable.");
  }
  DATABASE_URL = process.env.DEV_DATABASE_URL;
} else if (NODE_ENV === "test") {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("You must set the TEST_DATABASE_URL env variable.");
  }
  DATABASE_URL = process.env.TEST_DATABASE_URL;
} else {
  throw new Error(
    "NODE_ENV was set to an invalid value. The NODE_ENV options are: production, development, test.",
  );
}

const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });
