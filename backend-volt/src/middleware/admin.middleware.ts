import type { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../errors.js";

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user || !req.user.isAdmin) {
    throw new ForbiddenError("Forbidden. Admin access required.");
  }
  next();
};
