import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import type { CreateMealInput, UpdateMealInput } from "../types/meal.dto.js";

async function getAllMeals(logId: number, userId: number) {
  const log = await prisma.nutritionLog.findUnique({
    where: { id: logId, userId },
    include: { meals: true },
  });

  if (!log) {
    throw new NotFoundError(`Log with id: ${logId} not found.`);
  }

  return { meals: log.meals };
}

async function getMealById(logId: number, userId: number, mealId: number) {
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, nutritionLogId: logId, nutritionLog: { userId } },
  });

  if (!meal) {
    throw new NotFoundError(`Meal with id: ${mealId} not found.`);
  }

  return meal;
}

async function createMeal(
  logId: number,
  userId: number,
  data: CreateMealInput,
) {
  return await prisma.$transaction(async (tx) => {
    // Check log existence and ownership
    const existingLog = await tx.nutritionLog.findUnique({
      where: { id: logId, userId },
    });
    if (!existingLog) {
      throw new NotFoundError("Log associated to this meal does not exist.");
    }

    return await tx.meal.create({ data });
  });
}

async function updateMeal(
  logId: number,
  userId: number,
  mealId: number,
  data: UpdateMealInput,
) {
  try {
    const updatedMeal = await prisma.meal.update({
      where: { id: mealId, nutritionLogId: logId, nutritionLog: { userId } },
      data,
    });
    return updatedMeal;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Meal not found.", { cause: error });
    }
    throw error;
  }
}

async function deleteMeal(logId: number, userId: number, mealId: number) {
  try {
    await prisma.meal.delete({
      where: { id: mealId, nutritionLogId: logId, nutritionLog: { userId } },
    });
    return;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Meal not found.", { cause: error });
    }
    throw error;
  }
}

export { getAllMeals, getMealById, createMeal, updateMeal, deleteMeal };
