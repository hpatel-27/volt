import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";

async function getAllMeals(logId: number, userId: number) {
  const log = await prisma.nutritionLog.findUnique({
    where: { id: logId, userId },
    include: { meals: true },
  });

  if (!log) {
    throw new NotFoundError(`Log with id: ${logId} not found.`);
  }

  return log.meals;
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
  mealData: Prisma.MealUncheckedCreateInput,
) {
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

async function updateMeal(
  logId: number,
  userId: number,
  mealId: number,
  mealData: Prisma.MealUncheckedUpdateInput,
) {
  try {
    const updatedMeal = await prisma.meal.update({
      where: { id: mealId, nutritionLogId: logId, nutritionLog: { userId } },
      data: mealData,
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
