import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

// Use `getAuth()` to protect a route based on authorization status
export const hasPermission = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { isAuthenticated } = getAuth(req);
  // Handle if the user is not authorized
  if (!isAuthenticated) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  return next();
};
