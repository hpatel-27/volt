import type { Request, Response } from "express";
import * as mealService from "../services/meal.service.js";
import { NotFoundError } from "../errors.js";

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

export { getAllMeals, getMealById };
