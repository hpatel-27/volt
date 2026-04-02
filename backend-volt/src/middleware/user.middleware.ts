import type { Request, Response, NextFunction } from "express";
import { getUser } from "../services/user.service.js";
import { getAuth } from "@clerk/express";

export async function userMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Get userId from the Clerk session. If there is no userId, the user is not authenticated
  const { isAuthenticated, userId } = getAuth(req);
  // Handle if the user is not authorized
  if (!isAuthenticated) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  // Look up the user
  try {
    const user = await getUser(userId);
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in user middleware:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
