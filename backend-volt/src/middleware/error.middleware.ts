import type { Request, Response, NextFunction } from "express";
import {
  NotFoundError,
  DuplicateEntryError,
  BadRequestError,
} from "../errors.js";

// Centralized Express error handler. Mounted last in server.ts so it catches
// anything thrown (or passed to next()) from routes above it.
// Note: Express detects this as error-handling middleware by its arity (4
// params). `next` must stay in the signature even if unused.
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Log the entire error with the stacktrace
  console.error(`Request ID: ${req.id}`, err);

  // Existing custom errors
  const errors = [NotFoundError, DuplicateEntryError, BadRequestError];
  for (const e of errors) {
    if (err instanceof e) {
      return res
        .status(err.statusCode)
        .json({ error: err.message, requestId: req.id });
    }
  }
  return res
    .status(500)
    .json({ error: "Internal server error", requestId: req.id });
}
