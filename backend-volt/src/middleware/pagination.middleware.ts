import type { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../errors.js";

const MAX_PAGE = 100;
const MAX_LIMIT = 10;

// Returns the value
const parsePositiveInt = (value: unknown): number | null => {
  if (typeof value !== "string") return null;

  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num < 1) return null;

  return num;
};

export const paginationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const page = parsePositiveInt(req.query.page);
  const limit = parsePositiveInt(req.query.limit);

  if (page === null || limit === null) {
    throw new BadRequestError("Page and limit must be positive integers");
  }

  req.pagination = {
    page: Math.min(page, MAX_PAGE),
    limit: Math.min(limit, MAX_LIMIT),
  };

  next();
};
