import express from "express";
const router = express.Router();

import * as mealController from "../controllers/meal.controller.js";
// Meal Routes

// Get all meals for a nutrition log
router.get("/", mealController.getAllMeals);
// Get a specific meal from a log
router.get("/:mealId", mealController.getMealById);

export default router;
