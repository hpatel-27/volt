import type { Request, Response, NextFunction } from "express";
const validateDate = (date: unknown): string | null => {
  // Check if date is present, a string, and is a valid date
  if (!date || typeof date !== "string" || Number.isNaN(Date.parse(date))) {
    return null;
  }

  return date;
};

export const parseDate = (req: Request, res: Response, next: NextFunction) => {
  const { date } = req.body;

  const validatedDate = validateDate(date);
  if (!validatedDate) {
    return res
      .status(400)
      .json({ error: "Date must be a string in ISO 8601 format" });
  }

  // Convert date to ISO format and make available for subsequent middleware
  const isoDate = new Date(validatedDate).toISOString();
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
  const { date } = req.body;
  if (date === undefined) {
    next();
  }

  const validatedDate = validateDate(date);
  if (!validatedDate) {
    return res
      .status(400)
      .json({ error: "Date must be a string in ISO 8601 format" });
  }

  // Convert date to ISO format and make available for subsequent middleware
  const isoDate = new Date(validatedDate).toISOString();
  res.locals.date = isoDate;
  next();
};

export const parseDateRange =
  (maxRange: number | undefined) =>
  (req: Request, res: Response, next: NextFunction) => {
    const { from, to } = req.query;
    if (from === undefined || to === undefined) {
      return res
        .status(400)
        .json({ error: "The FROM and TO dates must both be provided" });
    }

    if (typeof from !== "string" || typeof to !== "string") {
      return res.status(400).json({
        error: "The FROM and TO dates must both be provided as strings",
      });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({
        error: "The FROM and TO dates must be valid ISO date strings",
      });
    }
    if (fromDate > toDate) {
      return res
        .status(400)
        .json({ error: "The FROM date must be on or before TO" });
    }

    if (maxRange !== undefined) {
      const diffMs = toDate.getTime() - fromDate.getTime();
      const maxMs = maxRange * 24 * 60 * 60 * 1000; // maxRange days
      if (diffMs > maxMs) {
        return res.status(400).json({
          error: `Date range is limited to a maximum of ${maxRange} days.`,
        });
      }
    }

    res.locals.fromDate = fromDate;
    res.locals.toDate = toDate;
    next();
  };
