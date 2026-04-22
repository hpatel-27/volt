import express from "express";
const router = express.Router({ mergeParams: true });

import * as mealController from "../controllers/meal.controller.js";
import { parseIntParam } from "../middleware/param.middleware.js";
// Meal Routes

// Get all meals for a nutrition log
router.get("/", mealController.getAllMeals);
// Get a specific meal from a log
router.get("/:mealId", parseIntParam("mealId"), mealController.getMealById);
// Create a meal and associate it to a nutrition log
router.post("/", mealController.createMeal);
// Update a meal in a given nutrition log
router.patch("/:mealId", parseIntParam("mealId"), mealController.updateMeal);
// Delete meal in a given nutrition log
router.delete("/:mealId", parseIntParam("mealId"), mealController.deleteMeal);

export default router;
