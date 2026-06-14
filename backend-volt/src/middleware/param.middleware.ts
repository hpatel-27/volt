import type { Request, Response, NextFunction } from "express";
import { isValidDateString, isFutureDate } from "../helpers/date.js";
import { BadRequestError } from "../errors.js";

// UUID v4 regex — matches the canonical 8-4-4-4-12 hex format
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const parseUuidParam =
  (paramName: string) => (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    // Check if value is present
    if (value === undefined || typeof value !== "string") {
      throw new BadRequestError(`${paramName} is a required string.`);
    }

    // Validate value is a UUID
    if (!UUID_REGEX.test(value)) {
      throw new BadRequestError(`Invalid ${paramName}`);
    }
    // Store the string value in res.locals for use in subsequent middleware or route handlers
    res.locals[paramName] = value;
    next();
  };

export const parseDateParam =
  (paramName: string) => (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    if (!isValidDateString(value)) {
      throw new BadRequestError(
        `${paramName} must be a date in YYYY-MM-DD format`,
      );
    }
    if (isFutureDate(value)) {
      throw new BadRequestError(`${paramName} cannot be in the future`);
    }
    res.locals[paramName] = value;
    next();
  };
