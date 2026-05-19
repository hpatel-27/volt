import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { DuplicateEntryError, NotFoundError } from "../errors.js";
import type {
  CreateNutritionLogInput,
  Totals,
  UpdateNutritionLogInput,
} from "../types/nutrition.dto.js";

// Take a userId and return all the user's logged nutrition logs
async function getAllNutritionLogs(
  userId: string,
  page: number,
  limit: number,
) {
  // Find the nutrition logs for the user
  const { nutritionLogs, total } = await prisma.$transaction(async (tx) => {
    const pageLogs = await tx.nutritionLog.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: "desc" },
    });
    const total = await tx.nutritionLog.count({ where: { userId } });
    const mealGroups = await tx.meal.groupBy({
      by: ["nutritionLogId"],
      where: { nutritionLogId: { in: pageLogs.map((l) => l.id) } },
      _sum: { calories: true, protein: true, carbs: true, fat: true },
    });

    const totalsByLogId = new Map<string, Totals>();
    mealGroups.forEach((group) => {
      totalsByLogId.set(group.nutritionLogId, {
        calories: group._sum.calories ?? 0,
        protein: group._sum.protein ?? 0,
        carbs: group._sum.carbs ?? 0,
        fat: group._sum.fat ?? 0,
      });
    });

    const nutritionLogs = pageLogs.map((l) => ({
      id: l.id,
      date: l.date,
      totals: totalsByLogId.get(l.id) ?? {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    }));
    return { nutritionLogs, total };
  });
  // An empty list of nutrition logs is still a valid response, so we return it as is
  return { nutritionLogs, total, page, limit };
}

// Return all of a user's nutrition logs whose `date` falls within [from, to].
async function getNutritionLogsByRange(userId: string, from: Date, to: Date) {
  const logs = await prisma.nutritionLog.findMany({
    where: { userId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });

  return { logs, total: logs.length };
}

async function getNutritionLogById(userId: string, logId: string) {
  const nutritionLog = await prisma.nutritionLog.findUnique({
    where: { id: logId, userId },
    include: { meals: true },
  });

  if (!nutritionLog) {
    throw new NotFoundError("Nutrition log not found.");
  }

  return nutritionLog;
}

// Return today's nutrition log as a summary (id, date, totals), or null if the user
// has not logged anything today. `date` is the user's local YYYY-MM-DD.
async function getTodayNutritionLog(userId: string, date: string) {
  const log = await prisma.nutritionLog.findUnique({
    where: { userId_date: { userId, date: new Date(date) } },
    include: { meals: true },
  });
  if (!log) return null;

  // Aggregate log's meals
  const totals = log.meals.reduce(
    (prev, current) => {
      return {
        calories: prev.calories + current.calories,
        protein: prev.protein + current.protein,
        carbs: prev.carbs + current.carbs,
        fat: prev.fat + current.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return { id: log.id, date, totals };
}

// Look up a nutrition log by the composite unique key (userId, date).
// The /:date URL param is YYYY-MM-DD; Prisma coerces it to a Date for @db.Date columns.
async function getNutritionLogByDate(userId: string, date: string) {
  const nutritionLog = await prisma.nutritionLog.findUnique({
    where: { userId_date: { userId, date: new Date(date) } },
    include: { meals: true },
  });

  if (!nutritionLog) {
    throw new NotFoundError("Nutrition log not found.");
  }

  return nutritionLog;
}

// @deprecated
// NOW DEPRECATED AND REPLACED WITH A FIND_OR_CREATE_NUTRITION_LOG FN
// Create a new nutrition log for the user, this initially only includes
// the date and an empty list of meals
async function createNutritionLog(data: CreateNutritionLogInput) {
  try {
    const newNutritionLog = await prisma.nutritionLog.create({
      data,
    });
    return newNutritionLog;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateEntryError(
        "A nutrition log at this date already exists.",
        { cause: error },
      );
    }
    throw error;
  }
}

// Find a nutrition log by (userId, date), or create one if it does not exist.
// Used by POST /nutrition-logs/:date/meals so the user can log a meal without
// having to explicitly create the parent log first.
async function findOrCreateNutritionLogByDate(userId: string, date: string) {
  const log = await prisma.nutritionLog.upsert({
    where: { userId_date: { userId, date: new Date(date) } },
    create: { userId, date: new Date(date) },
    // DON'T UPDATE
    update: {},
  });
  return log;
}

// The date is the only field that can be updated, as meals are managed through a
// separate set of endpoints. We use logData instead of directly taking a date
// parameter to allow for future extensibility and to maintain consistency with
// other update functions in our services.
async function updateNutritionLog(
  logId: string,
  userId: string,
  data: UpdateNutritionLogInput,
) {
  try {
    // Update the log only if the user and log id match an existing log
    const updatedLog = await prisma.nutritionLog.update({
      where: { id: logId, userId },
      data,
      include: { meals: true },
    });
    return updatedLog;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Nutrition log not found.", { cause: error });
    } else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateEntryError(
        "Nutrition log with this date already exists.",
        { cause: error },
      );
    }
    throw error;
  }
}

// Delete a nutrition log by its UUID id.
// This also deletes all meals associated with the log due to cascading delete.
async function deleteNutritionLog(logId: string, userId: string) {
  try {
    await prisma.nutritionLog.delete({
      where: { id: logId, userId },
    });
    return;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Nutrition log not found.", { cause: error });
    }
    throw error;
  }
}

// Delete a nutrition log by (userId, date) composite unique key.
// Used by DELETE /nutrition/:date.
async function deleteNutritionLogByDate(userId: string, date: string) {
  try {
    await prisma.nutritionLog.delete({
      where: { userId_date: { userId, date: new Date(date) } },
    });
    return;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Nutrition log not found.", { cause: error });
    }
    throw error;
  }
}

export {
  getAllNutritionLogs,
  getTodayNutritionLog,
  getNutritionLogsByRange,
  getNutritionLogById,
  getNutritionLogByDate,
  createNutritionLog,
  findOrCreateNutritionLogByDate,
  updateNutritionLog,
  deleteNutritionLog,
  deleteNutritionLogByDate,
};
