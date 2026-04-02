import express from "express";
const router = express.Router();

import * as weightController from "../controllers/weight.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";

// Get all of a User's weights
router.get("/", userMiddleware, weightController.getAllWeights);

export default router;
