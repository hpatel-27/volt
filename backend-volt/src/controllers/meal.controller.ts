import type { Request, Response } from "express";
import * as mealService from "../services/meal.service.js";
import type { Prisma } from "../generated/prisma/client.js";

async function getAllMeals(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as number;

  const meals = await mealService.getAllMeals(logId, userId);
  return res.json(meals);
}

async function getMealById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as number;
  const mealId = res.locals.mealId as number;

  if (!userId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const meal = await mealService.getMealById(logId, userId, mealId);
  res.json(meal);
}

// Create a meal for a nutrition log
async function createMeal(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as number;
  const { name, calories, protein, carbs, fat } = req.body;

  // Validate all the meal data
  if (name === undefined || typeof name !== "string" || name.length < 1) {
    return res.status(400).json({
      error: "Name is a required parameter and cannot be an empty string.",
    });
  }

  if (calories === undefined || typeof calories !== "number" || calories < 0) {
    return res.status(400).json({ error: "Calories is a required parameter." });
  }

  if (protein === undefined || typeof protein !== "number" || protein < 0) {
    return res.status(400).json({ error: "Protein is a required parameter." });
  }

  if (carbs === undefined || typeof carbs !== "number" || carbs < 0) {
    return res.status(400).json({ error: "Carbs is a required parameter." });
  }

  if (fat === undefined || typeof fat !== "number" || fat < 0) {
    return res.status(400).json({ error: "Fat is a required parameter." });
  }

  const mealData: Prisma.MealUncheckedCreateInput = {
    nutritionLogId: logId,
    name,
    calories,
    protein,
    carbs,
    fat,
  };

  const newMeal = await mealService.createMeal(logId, userId, mealData);
  res.status(201).json(newMeal);
}

// Update meal
async function updateMeal(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as number;
  const mealId = res.locals.mealId as number;

  const { name, calories, carbs, protein, fat } = req.body;

  // validate any provided data to update
  const mealData: Prisma.MealUncheckedUpdateInput = {};

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
    if (typeof calories !== "number" || calories < 0) {
      return res.status(400).json({
        error: "Calories must be a non-negative number.",
      });
    }
    mealData.calories = calories;
  }

  if (carbs !== undefined) {
    if (typeof carbs !== "number" || carbs < 0) {
      return res.status(400).json({
        error: "Carbs must be a non-negative number.",
      });
    }
    mealData.carbs = carbs;
  }

  if (protein !== undefined) {
    if (typeof protein !== "number" || protein < 0) {
      return res.status(400).json({
        error: "Protein must be a non-negative number.",
      });
    }
    mealData.protein = protein;
  }

  if (fat !== undefined) {
    if (typeof fat !== "number" || fat < 0) {
      return res.status(400).json({
        error: "Fat must be a non-negative number.",
      });
    }
    mealData.fat = fat;
  }

  if (Object.keys(mealData).length === 0) {
    return res
      .status(400)
      .json({ error: "No valid fields were provided to update." });
  }

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
  const logId = res.locals.logId as number;
  const mealId = res.locals.mealId as number;

  await mealService.deleteMeal(logId, userId, mealId);
  return res.status(204).send();
}

export { getAllMeals, getMealById, createMeal, updateMeal, deleteMeal };
