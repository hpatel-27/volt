import express from "express";
const router = express.Router();

import * as weightController from "../controllers/weight.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";
import { parseIntParam } from "../middleware/param.middleware.js";

// Get all of a user's weights with pagination
router.get("/", userMiddleware, weightController.getAllWeights);

// Create a new weight entry
router.post("/", userMiddleware, weightController.createWeight);

// Update a weight entry by its ID
router.patch(
  "/:weightId",
  userMiddleware,
  parseIntParam("mealId"),
  weightController.updateWeight,
);

// Delete a weight entry by its ID
router.delete(
  "/:weightId",
  userMiddleware,
  parseIntParam("mealId"),
  weightController.deleteWeight,
);

export default router;
