import type { Request, Response } from "express";
import * as mealService from "../services/meal.service.js";
import * as nutritionService from "../services/nutrition.service.js";
import type { CreateMealInput, UpdateMealInput } from "../types/meal.dto.js";
import { validateNonNegativeNumber } from "../helpers/validators.js";

// Resolve the nutrition log UUID from the merged :date param.
// Meal routes are nested under /nutrition/:date/meals, so req.params.date is the
// YYYY-MM-DD key. We look up the log by (userId, date) to get its UUID, then
// delegate to the meal service (which uses logId UUID for all queries).
async function resolveLogId(userId: string, date: string): Promise<string> {
  const log = await nutritionService.getNutritionLogByDate(userId, date);
  return log.id;
}

async function getAllMeals(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  // parseDateParam middleware stores the validated date in res.locals.date
  const date = res.locals.date as string;

  const logId = await resolveLogId(userId, date);
  const meals = await mealService.getAllMeals(logId, userId);
  return res.json(meals);
}

async function getMealById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const date = res.locals.date as string;
  const mealId = res.locals.mealId as string;

  const logId = await resolveLogId(userId, date);
  const meal = await mealService.getMealById(logId, userId, mealId);
  res.json(meal);
}

// Create a meal for a nutrition log
async function createMeal(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const date = res.locals.date as string;
  const { name, calories, protein, carbs, fat } = req.body;

  // Validate all the meal data
  if (name === undefined || typeof name !== "string" || name.length < 1) {
    return res.status(400).json({
      error: "Name is a required parameter and cannot be an empty string.",
    });
  }

  validateNonNegativeNumber("calories", calories);
  validateNonNegativeNumber("protein", protein);
  validateNonNegativeNumber("carbs", carbs);
  validateNonNegativeNumber("fat", fat);

  const log = await nutritionService.findOrCreateNutritionLogByDate(
    userId,
    date,
  );

  const mealData: CreateMealInput = {
    nutritionLogId: log.id,
    name,
    calories,
    protein,
    carbs,
    fat,
  };

  const newMeal = await mealService.createMeal(mealData);
  res.status(201).json(newMeal);
}

// Update meal
async function updateMeal(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const date = res.locals.date as string;
  const mealId = res.locals.mealId as string;

  const { name, calories, carbs, protein, fat } = req.body;

  // validate any provided data to update
  const mealData: UpdateMealInput = {};

  // Validate allowed fields
  if (name !== undefined) {
    if (typeof name !== "string" || name.length < 1) {
      return res
        .status(400)
        .json({ error: "Meal name cannot be an empty string." });
    }
    mealData.name = name;
  }

  if (calories !== undefined) {
    validateNonNegativeNumber("calories", calories);
    mealData.calories = calories;
  }

  if (carbs !== undefined) {
    validateNonNegativeNumber("carbs", carbs);
    mealData.carbs = carbs;
  }

  if (protein !== undefined) {
    validateNonNegativeNumber("protein", protein);
    mealData.protein = protein;
  }

  if (fat !== undefined) {
    validateNonNegativeNumber("fat", fat);
    mealData.fat = fat;
  }

  if (Object.keys(mealData).length === 0) {
    return res
      .status(400)
      .json({ error: "No valid fields were provided to update." });
  }

  const logId = await resolveLogId(userId, date);
  const updatedMeal = await mealService.updateMeal(
    logId,
    userId,
    mealId,
    mealData,
  );
  res.json(updatedMeal);
}

// Delete a meal
async function deleteMeal(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const date = res.locals.date as string;
  const mealId = res.locals.mealId as string;

  const logId = await resolveLogId(userId, date);
  await mealService.deleteMeal(logId, userId, mealId);
  return res.status(204).send();
}

export { getAllMeals, getMealById, createMeal, updateMeal, deleteMeal };
