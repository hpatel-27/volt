import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";

// Get all meals that are associated with a specific logId
// Log must be associated with the user, meals must be associated to the log
async function getAllMeals(logId: number, userId: number) {
  try {
    // Check that the user has ownership of the log we are retrieving from
    const log = await prisma.nutritionLog.findUnique({
      where: { id: logId, userId },
    });

    // Log with the provided id does not exist or does not match to the user
    if (!log) {
      throw new NotFoundError(`Log with id: ${logId} not found.`);
    }

    // Find the meals for the existing log
    const meals = await prisma.meal.findMany({
      where: { nutritionLogId: logId },
    });
    return meals;
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      throw error;
    } else if (error instanceof Error) {
      throw new Error("Error retrieving meals for this log.");
    } else {
      throw new Error("Unknown error when retrieving meals for this log.");
    }
  }
}

async function getMealById(logId: number, userId: number, mealId: number) {
  try {
    // Check that the user has ownership of the log we are retrieving from
    const log = await prisma.nutritionLog.findUnique({
      where: { id: logId, userId },
    });

    // Log with the provided id does not exist or does not match to the user
    if (!log) {
      throw new NotFoundError(`Log with id: ${logId} not found.`);
    }

    // Find the meals for the existing log
    const meal = await prisma.meal.findUnique({
      where: { id: mealId, nutritionLogId: logId },
    });

    if (!meal) {
      throw new NotFoundError(`Meal wit id: ${mealId} not found.`);
    }

    return meal;
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      throw error;
    } else if (error instanceof Error) {
      throw new Error("Error retrieving meals for this log.");
    } else {
      throw new Error("Unknown error when retrieving meals for this log.");
    }
  }
}

export { getAllMeals, getMealById };
