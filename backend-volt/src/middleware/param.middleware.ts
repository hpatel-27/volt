import type { Request, Response, NextFunction } from "express";

export const parseIntParam =
  (paramName: string) => (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    // Check if value is present
    if (!value || typeof value !== "string") {
      return res.status(400).json({ error: `${paramName} is required.` });
    }

    // Validate value is a number
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      return res.status(400).json({ error: `Invalid ${paramName}` });
    }
    // Store the parsed value in res.locals for use in subsequent middleware or route handlers
    res.locals[paramName] = parsed;
    next();
  };
