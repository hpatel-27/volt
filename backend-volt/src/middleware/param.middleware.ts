import type { Request, Response, NextFunction } from "express";

// parseIntParam is kept for workout routes (workoutPlan, workoutDay, workoutLog,
// workoutDayExercise, setLog, exerciseLog) whose schema migration is out of scope
// for this task. Once those models are migrated to UUID PKs, replace with parseUuidParam.
export const parseIntParam =
  (paramName: string) => (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    // Check if value is present
    if (value === undefined) {
      return res.status(400).json({ error: `${paramName} is required.` });
    }

    // Validate value is a number
    const parsed = Number.parseInt(value as string, 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return res.status(400).json({ error: `Invalid ${paramName}` });
    }
    // Store the parsed value in res.locals for use in subsequent middleware or route handlers
    res.locals[paramName] = parsed;
    next();
  };

// UUID v4 regex — matches the canonical 8-4-4-4-12 hex format
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const parseUuidParam =
  (paramName: string) => (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    // Check if value is present
    if (value === undefined || typeof value !== "string") {
      return res
        .status(400)
        .json({ error: `${paramName} is a required string.` });
    }

    // Validate value is a UUID
    if (!UUID_REGEX.test(value)) {
      return res.status(400).json({ error: `Invalid ${paramName}` });
    }
    // Store the string value in res.locals for use in subsequent middleware or route handlers
    res.locals[paramName] = value;
    next();
  };

// YYYY-MM-DD format check — Prisma will coerce the string to a Date
const DATE_PARAM_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const parseDateParam =
  (paramName: string) => (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    if (value === undefined || typeof value !== "string") {
      return res
        .status(400)
        .json({ error: `${paramName} is a required string.` });
    }
    if (!DATE_PARAM_REGEX.test(value)) {
      return res
        .status(400)
        .json({ error: `${paramName} must be a date in YYYY-MM-DD format` });
    }
    res.locals[paramName] = value;
    next();
  };
