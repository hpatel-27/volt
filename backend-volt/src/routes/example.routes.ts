import express from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { hasPermission } from "../middleware/auth.js";

const router = express.Router();

// Clerk middleware protects all routes
router.get("/protected", hasPermission, async (req, res) => {
  // Use `getAuth()` to get the user's `userId`
  // const { isAuthenticated, userId } = getAuth(req);
  const { userId } = getAuth(req);

  // Use Clerk's JS Backend SDK to get the user's User object
  const user = await clerkClient.users.getUser(userId!);

  return res.json({ user });
});

export default router;
