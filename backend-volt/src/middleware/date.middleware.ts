import type { Request, Response, NextFunction } from "express";
import { isValidDateString, isFutureDate } from "../helpers/date.js";
import { BadRequestError } from "../errors.js";

export const parseDate = (req: Request, res: Response, next: NextFunction) => {
  const { date } = req.body ?? {};

  if (!isValidDateString(date)) {
    throw new BadRequestError("Date must be a string in ISO 8601 format");
  }

  if (isFutureDate(date)) {
    throw new BadRequestError("Date cannot be in the future");
  }

  // Convert date to ISO format and make available for subsequent middleware
  const isoDate = new Date(date).toISOString();
  res.locals.date = isoDate;
  next();
};

// If date is absent from the body, call next() without setting res.locals.date.
// If date is present, apply the same type and format checks as parseDate,
// then normalize to ISO and store in res.locals.date.
export const parseOptionalDate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { date } = req.body ?? {};
  if (date === undefined) {
    return next();
  }

  if (!isValidDateString(date)) {
    throw new BadRequestError("Date must be a string in ISO 8601 format");
  }

  if (isFutureDate(date)) {
    throw new BadRequestError("Date cannot be in the future");
  }

  // Convert date to ISO format and make available for subsequent middleware
  const isoDate = new Date(date).toISOString();
  res.locals.date = isoDate;
  next();
};

export const parseDateRange =
  (maxRange: number | undefined) =>
  (req: Request, res: Response, next: NextFunction) => {
    const { from, to } = req.query ?? {};
    if (from === undefined || to === undefined) {
      throw new BadRequestError("The FROM and TO dates must both be provided");
    }

    if (!isValidDateString(from) || !isValidDateString(to))
      throw new BadRequestError("Date strings must be in ISO 8601 format");

    if (from > to) {
      throw new BadRequestError("The FROM date must be on or before TO");
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (maxRange !== undefined) {
      const diffMs = toDate.getTime() - fromDate.getTime();
      const maxMs = maxRange * 24 * 60 * 60 * 1000; // maxRange days
      if (diffMs > maxMs) {
        throw new BadRequestError(
          `Date range is limited to a maximum of ${maxRange} days.`,
        );
      }
    }

    res.locals.fromDate = fromDate;
    res.locals.toDate = toDate;
    next();
  };
