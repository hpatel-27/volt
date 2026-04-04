import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { DuplicateEntryError, NotFoundError } from "../errors.js";

// Take a userId and return all the user's logged nutrition logs
async function getAllNutritionLogs(
  userId: number,
  page: number,
  limit: number,
) {
  try {
    // Find the nutrition logs for the user
    const [nutritionLogs, total] = await prisma.$transaction([
      prisma.nutritionLog.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
      }),
      prisma.nutritionLog.count({ where: { userId } }),
    ]);
    // An empty list of nutrition logs is still a valid response, so we return it as is
    return { nutritionLogs, total, page, limit };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error("Error fetching nutrition logs from database.");
    } else {
      throw new Error("Unknown error fetching nutrition logs from database");
    }
  }
}

async function getNutritionLogById(userId: number, logId: number) {
  try {
    const nutritionLog = await prisma.nutritionLog.findUnique({
      where: { id: logId, userId },
    });

    if (!nutritionLog) {
      throw new NotFoundError("Nutrition log not found");
    }

    return nutritionLog;
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      throw error; // Re-throw NotFoundError to be handled by the controller
    } else if (error instanceof Error) {
      throw new Error("Error fetching nutrition log from database.");
    } else {
      throw new Error("Unknown error fetching nutrition log from database");
    }
  }
}

// Create a new nutrition log for the user, this initially only includes
// the date and an empty list of meals
async function createNutritionLog(
  logData: Prisma.NutritionLogUncheckedCreateInput,
) {
  try {
    const newNutritionLog = await prisma.nutritionLog.create({
      data: logData,
    });
    return newNutritionLog;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateEntryError(
        "A nutrition log at this date already exists.",
      );
    } else if (error instanceof Error) {
      throw new Error("Error creating nutrition log in database.");
    } else {
      throw new Error("Unknown error creating nutrition log in database");
    }
  }
}

export { getAllNutritionLogs, getNutritionLogById, createNutritionLog };
