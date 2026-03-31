import { User } from "../../src/generated/prisma/client.ts";

declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}
