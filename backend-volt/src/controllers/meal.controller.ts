import type { Request, Response } from "express";
import * as mealService from "../services/meal.service.js";
import { NotFoundError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";

async function getAllMeals(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const logId = req.params.logId;

    // Check if user and logId are present
    if (!userId || !logId || typeof logId !== "string") {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate logId is a number
    const parsedLogId = parseInt(logId, 10);
    if (isNaN(parsedLogId)) {
      return res.status(400).json({ error: "Invalid log ID" });
    }

    const meals = await mealService.getAllMeals(parsedLogId, userId);
    return res.json(meals);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error." });
    }
  }
}

async function getMealById(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const logId = req.params.logId;
    const mealId = req.params.mealId;

    // Check if user and logId are present
    if (
      !userId ||
      !logId ||
      !mealId ||
      typeof logId !== "string" ||
      typeof mealId !== "string"
    ) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate logId is a number
    const parsedLogId = parseInt(logId, 10);
    if (isNaN(parsedLogId)) {
      return res.status(400).json({ error: "Invalid log ID" });
    }

    // Validate mealId is a number
    const parsedMealId = parseInt(mealId, 10);
    if (isNaN(parsedMealId)) {
      return res.status(400).json({ error: "Invalid meal ID" });
    }

    const meal = await mealService.getMealById(
      parsedLogId,
      userId,
      parsedMealId,
    );
    res.json(meal);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error." });
    }
  }
}

// Create a meal for a nutrition log
async function createMeal(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const logId = req.params.logId;
    const { name, calories, protein, carbs, fat } = req.body;

    // Check if user and logId are present
    if (!userId || !logId || typeof logId !== "string") {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate logId is a number
    const parsedLogId = parseInt(logId, 10);
    if (isNaN(parsedLogId)) {
      return res.status(400).json({ error: "Invalid log ID" });
    }

    // Validate all the meal data
    if (name === undefined || typeof name !== "string" || name.length < 1) {
      return res.status(400).json({
        error: "Name is a required parameter and cannot be an empty string.",
      });
    }

    if (
      calories === undefined ||
      typeof calories !== "number" ||
      calories < 0
    ) {
      return res
        .status(400)
        .json({ error: "Calories is a required parameter." });
    }

    if (protein === undefined || typeof protein !== "number" || protein < 0) {
      return res
        .status(400)
        .json({ error: "Protein is a required parameter." });
    }

    if (carbs === undefined || typeof carbs !== "number" || carbs < 0) {
      return res.status(400).json({ error: "Carbs is a required parameter." });
    }

    if (fat === undefined || typeof fat !== "number" || fat < 0) {
      return res.status(400).json({ error: "Fat is a required parameter." });
    }

    const mealData: Prisma.MealUncheckedCreateInput = {
      nutritionLogId: parsedLogId,
      name,
      calories,
      protein,
      carbs,
      fat,
    };

    const newMeal = await mealService.createMeal(parsedLogId, userId, mealData);
    res.status(201).json(newMeal);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res
        .status(500)
        .json({ error: "Unknown error encountered when creating a meal." });
    }
  }
}

// Update meal
async function updateMeal(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const logId = req.params.logId;
    const mealId = req.params.mealId;

    const { name, calories, carbs, protein, fat } = req.body;

    // Check if user and logId are present
    if (
      !userId ||
      !logId ||
      !mealId ||
      typeof logId !== "string" ||
      typeof mealId !== "string"
    ) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate logId is a number
    const parsedLogId = parseInt(logId, 10);
    if (isNaN(parsedLogId)) {
      return res.status(400).json({ error: "Invalid log ID" });
    }

    // Validate mealId is a number
    const parsedMealId = parseInt(mealId, 10);
    if (isNaN(parsedMealId)) {
      return res.status(400).json({ error: "Invalid meal ID" });
    }

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

    // mealData has been built with the provided data
    if (Object.keys(mealData).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields were provided to update." });
    }

    const updatedMeal = await mealService.updateMeal(
      parsedLogId,
      userId,
      parsedMealId,
      mealData,
    );
    res.json(updatedMeal);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res
        .status(500)
        .json({ error: "Unknown error occurred during meal update." });
    }
  }
}

// Delete a meal
async function deleteMeal(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const logId = req.params.logId;
    const mealId = req.params.mealId;

    // Check if user and logId are present
    if (
      !userId ||
      !logId ||
      !mealId ||
      typeof logId !== "string" ||
      typeof mealId !== "string"
    ) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate logId is a number
    const parsedLogId = parseInt(logId, 10);
    if (isNaN(parsedLogId)) {
      return res.status(400).json({ error: "Invalid log ID" });
    }

    // Validate mealId is a number
    const parsedMealId = parseInt(mealId, 10);
    if (isNaN(parsedMealId)) {
      return res.status(400).json({ error: "Invalid meal ID" });
    }

    await mealService.deleteMeal(parsedLogId, userId, parsedMealId);
    return res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res
        .status(500)
        .json({ error: "Unknown error occurred during meal update." });
    }
  }
}

export { getAllMeals, getMealById, createMeal, updateMeal, deleteMeal };
