import express from "express";
const router = express.Router();

import { userMiddleware } from "../middleware/user.middleware.js";
import * as nutritionController from "../controllers/nutrition.controller.js";
import mealRouter from "./meal.routes.js";

// All routes in this file require the user to be authenticated, so we apply the userMiddleware to all routes

// Nutrition Routes

// Get all nutrition logs (as summaries) for the user that made the request, with pagination
router.get("/", userMiddleware, nutritionController.getAllNutritionLogs);
// Get a single nutrition log by its ID, this includes full meal details
router.get("/:id", userMiddleware, nutritionController.getNutritionLogById);
// Create a new nutrition log
router.post("/", userMiddleware, nutritionController.createNutritionLog);
// Update a nutrition log (change the recorded date)
router.patch("/:id", userMiddleware, nutritionController.updateNutritionLog);
// Delete a nutrition log
router.delete("/:id", userMiddleware, nutritionController.deleteNutritionLog);

// Mount Meal routes
router.use("/:logId/meals", mealRouter);

export default router;
