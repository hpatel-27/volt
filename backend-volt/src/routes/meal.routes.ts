import express from "express";
const router = express.Router();

import * as mealController from "../controllers/meal.controller.js";
// Meal Routes

// Get all meals for a nutrition log
router.get("/", mealController.getAllMeals);
// Get a specific meal from a log
router.get("/:mealId", mealController.getMealById);
// Create a meal and associate it to a nutrition log
router.post("/", mealController.createMeal);
// Update a meal in a given nutrition log
router.patch("/:mealId", mealController.updateMeal);
// Delete meal in a given nutrition log
router.delete("/:mealId", mealController.deleteMeal);

export default router;
