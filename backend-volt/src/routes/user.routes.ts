import express from "express";
const router = express.Router();

import * as userController from "../controllers/user.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";

// Get the authenticated user
router.get("/me", userMiddleware, userController.getCurrentUser);

export default router;
