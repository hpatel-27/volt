import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import type { CreateMealInput, UpdateMealInput } from "../types/meal.dto.js";
import { findOrCreateNutritionLogByDate } from "./nutrition.service.js";
import { toMealDto } from "../mappers/meal.mapper.js";

async function getAllMeals(logId: string, userId: string) {
  const log = await prisma.nutritionLog.findUnique({
    where: { id: logId, userId },
    include: { meals: true },
  });

  if (!log) {
    throw new NotFoundError(`Log with id: ${logId} not found.`);
  }
  const safeMeals = log.meals.map((m) => toMealDto(m));
  return { meals: safeMeals };
}

async function getMealById(logId: string, userId: string, mealId: string) {
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, nutritionLogId: logId, nutritionLog: { userId } },
  });

  if (!meal) {
    throw new NotFoundError(`Meal with id: ${mealId} not found.`);
  }

  return toMealDto(meal);
}

async function createMeal(data: CreateMealInput) {
  const meal = await prisma.meal.create({ data });
  return toMealDto(meal);
}

async function updateMeal(
  logId: string,
  userId: string,
  mealId: string,
  data: UpdateMealInput,
) {
  try {
    const updatedMeal = await prisma.meal.update({
      where: { id: mealId, nutritionLogId: logId, nutritionLog: { userId } },
      data,
    });
    return toMealDto(updatedMeal);
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

async function deleteMeal(logId: string, userId: string, mealId: string) {
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
