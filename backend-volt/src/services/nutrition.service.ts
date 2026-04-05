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

// The date is the only field that can be updated, as meals are managed through a
// separate set of endpoints. We use logData instead of directly taking a date
// parameter to allow for future extensibility and to maintain consistency with
// other update functions in our services.
async function updateNutritionLog(
  logId: number,
  userId: number,
  logData: Prisma.NutritionLogUpdateInput,
) {
  try {
    // Update the log only if the user and log id match an existing log
    const updatedLog = await prisma.nutritionLog.update({
      where: { id: logId, userId },
      data: logData,
    });
    return updatedLog;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Nutrition log not found.");
    } else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateEntryError(
        "Nutrition log with this date already exists.",
      );
    } else if (error instanceof Error) {
      throw new Error("Error updating nutrition log in database.");
    } else {
      throw new Error("Unknown error updating nutrition log in database");
    }
  }
}

// Delete a nutrition log, this also deletes all meals associated with the log
// due to the cascading delete behavior we set up in our Prisma schema
// We require both the logId and userId to ensure that a user can only delete their own logs
async function deleteNutritionLog(logId: number, userId: number) {
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
      throw new NotFoundError("Nutrition log not found.");
    } else if (error instanceof Error) {
      throw new Error("Error deleting nutrition log from database.");
    } else {
      throw new Error("Unknown error occurred while deleting nutrition log.");
    }
  }
}

export {
  getAllNutritionLogs,
  getNutritionLogById,
  createNutritionLog,
  updateNutritionLog,
  deleteNutritionLog,
};
