import express from "express";
const router = express.Router();

import * as nutritionController from "../controllers/nutrition.controller.js";
import { userMiddleware } from "../middleware/user.middleware.js";
import { parseIntParam } from "../middleware/param.middleware.js";
import { paginationMiddleware } from "../middleware/pagination.middleware.js";
import mealRouter from "./meal.routes.js";

// All routes in this file require the user to be authenticated, so we apply the userMiddleware to all routes

// Nutrition Routes

// Get all nutrition logs (as summaries) for the user that made the request, with pagination
router.get(
  "/",
  userMiddleware,
  paginationMiddleware,
  nutritionController.getAllNutritionLogs,
);
// Get a single nutrition log by its ID, this includes full meal details
router.get(
  "/:logId",
  userMiddleware,
  parseIntParam("logId"),
  nutritionController.getNutritionLogById,
);
// Create a new nutrition log
router.post("/", userMiddleware, nutritionController.createNutritionLog);
// Update a nutrition log (change the recorded date)
router.patch(
  "/:logId",
  userMiddleware,
  parseIntParam("logId"),
  nutritionController.updateNutritionLog,
);
// Delete a nutrition log
router.delete(
  "/:logId",
  userMiddleware,
  parseIntParam("logId"),
  nutritionController.deleteNutritionLog,
);

// Mount Meal routes
router.use("/:logId/meals", userMiddleware, parseIntParam("logId"), mealRouter);

export default router;
