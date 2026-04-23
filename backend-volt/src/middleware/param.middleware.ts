import type { Request, Response, NextFunction } from "express";

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
