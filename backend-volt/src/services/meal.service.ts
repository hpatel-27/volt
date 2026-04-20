import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";

// Get all meals that are associated with a specific logId
// Log must be associated with the user, meals must be associated to the log
async function getAllMeals(logId: number, userId: number) {
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
}

async function getMealById(logId: number, userId: number, mealId: number) {
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
    throw new NotFoundError(`Meal with id: ${mealId} not found.`);
  }

  return meal;
}

// Create a meal in a nutrition log
async function createMeal(
  logId: number,
  userId: number,
  mealData: Prisma.MealUncheckedCreateInput,
) {
  // Confirm the log exists for the user
  const existingLog = await prisma.nutritionLog.findUnique({
    where: { id: logId, userId },
  });

  if (!existingLog) {
    throw new NotFoundError("Log associated to this meal does not exist.");
  }

  const newMeal = await prisma.meal.create({
    data: mealData,
  });
  return newMeal;
}

// Update a meal in a nutrition log
async function updateMeal(
  logId: number,
  userId: number,
  mealId: number,
  mealData: Prisma.MealUncheckedUpdateInput,
) {
  try {
    // Confirm the log exists for the user
    const existingLog = await prisma.nutritionLog.findUnique({
      where: { id: logId, userId },
    });

    if (!existingLog) {
      throw new NotFoundError("Log associated to this meal does not exist.");
    }

    const updatedMeal = await prisma.meal.update({
      where: { id: mealId, nutritionLogId: logId },
      data: mealData,
    });
    return updatedMeal;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Meal to update not found.", { cause: error });
    }
    throw error;
  }
}

// Delete a meal
async function deleteMeal(logId: number, userId: number, mealId: number) {
  try {
    // Confirm the log exists for the user
    const existingLog = await prisma.nutritionLog.findUnique({
      where: { id: logId, userId },
    });

    if (!existingLog) {
      throw new NotFoundError("Log associated to this meal does not exist.");
    }

    await prisma.meal.delete({
      where: { id: mealId, nutritionLogId: logId },
    });
    return;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Meal to delete not found.", { cause: error });
    }
    throw error;
  }
}

export { getAllMeals, getMealById, createMeal, updateMeal, deleteMeal };
