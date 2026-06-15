import express from "express";
const router = express.Router();

import * as userController from "../controllers/user.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";

// Get the authenticated user
router.get("/me", userMiddleware, userController.getCurrentUser);

// Update the authenticated user's profile
router.patch("/me", userMiddleware, userController.updateUser);

// Delete the authenticated user's account (removes the Clerk account, then
// cascades the user's DB data)
router.delete("/me", userMiddleware, userController.deleteAccount);

export default router;
