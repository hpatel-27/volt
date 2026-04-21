import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export function requestIdMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  req.id = randomUUID();
  next();
}
