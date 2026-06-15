import type { Request, Response, NextFunction } from "express";
import { getUser } from "../services/user.service.js";
import { clerkClient, getAuth } from "@clerk/express";
import { UnauthorizedError } from "../errors.js";

export async function userMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Get userId from the Clerk session. If there is no userId, the user is not authenticated
  const { isAuthenticated, userId } = getAuth(req);
  // Handle if the user is not authorized
  if (!isAuthenticated) {
    throw new UnauthorizedError("Unauthorized.");
  }

  // Look up the user
  const clerkUser = await clerkClient.users.getUser(userId);
  try {
    const user = await getUser(
      userId,
      clerkUser.emailAddresses[0]?.emailAddress ?? null,
      clerkUser.firstName,
      clerkUser.lastName,
    );
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
