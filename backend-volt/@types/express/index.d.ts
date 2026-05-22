import type { User } from "../../src/generated/prisma/client.js";
import type { Pagination } from "../../src/types/pagination.ts";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      id?: string;
      pagination?: Pagination;
    }
    interface Locals {
      fromDate?: Date;
      toDate?: Date;
    }
  }
}
