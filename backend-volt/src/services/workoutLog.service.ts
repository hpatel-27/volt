import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import type {
  CreateWorkoutLogInput,
  UpdateWorkoutLogInput,
} from "../types/workoutLog.dto.js";

async function getAllWorkoutLogs(userId: string, page: number, limit: number) {
  const [workoutLogs, total] = await prisma.$transaction([
    prisma.workoutLog.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: "desc" },
      include: { workoutDay: true },
    }),
    prisma.workoutLog.count({ where: { userId } }),
  ]);
  return { workoutLogs, total, page, limit };
}

async function getWorkoutLogById(userId: string, logId: string) {
  const workoutLog = await prisma.workoutLog.findUnique({
    where: { id: logId, userId },
    include: {
      workoutDay: true,
      exerciseLogs: {
        include: {
          exercise: true,
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });

  if (!workoutLog) {
    throw new NotFoundError("Workout log not found.");
  }

  return workoutLog;
}

async function createWorkoutLog(userId: string, data: CreateWorkoutLogInput) {
  if (data.workoutDayId) {
    return await prisma.$transaction(async (tx) => {
      // Verify the workout day exists and belongs to the user
      const day = await tx.workoutDay.findFirst({
        where: {
          id: data.workoutDayId!,
          workoutPlan: { userId },
        },
      });
      if (!day) {
        throw new NotFoundError("Workout day not found.");
      }

      return await tx.workoutLog.create({
        data,
        include: { workoutDay: true },
      });
    });
  }

  return await prisma.workoutLog.create({
    data,
    include: { workoutDay: true },
  });
}

async function updateWorkoutLog(
  userId: string,
  logId: string,
  data: UpdateWorkoutLogInput,
) {
  // If updating workoutDayId to a non-null value, verify it belongs to the user
  if (data.workoutDayId) {
    return await prisma.$transaction(async (tx) => {
      const day = await tx.workoutDay.findFirst({
        where: {
          id: data.workoutDayId!,
          workoutPlan: { userId },
        },
      });
      if (!day) {
        throw new NotFoundError("Workout day not found.");
      }

      try {
        return await tx.workoutLog.update({
          where: { id: logId, userId },
          data,
          include: { workoutDay: true },
        });
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new NotFoundError("Workout log not found.", { cause: error });
        }
        throw error;
      }
    });
  }

  // If workoutDayId is not being updated, we can skip the transaction since we only need to update the workout log
  try {
    const updatedLog = await prisma.workoutLog.update({
      where: { id: logId, userId },
      data,
      include: { workoutDay: true },
    });
    return updatedLog;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Workout log not found.", { cause: error });
    }
    throw error;
  }
}

async function deleteWorkoutLog(userId: string, logId: string) {
  try {
    await prisma.workoutLog.delete({
      where: { id: logId, userId },
    });
    return;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Workout log not found.", { cause: error });
    }
    throw error;
  }
}

export {
  getAllWorkoutLogs,
  getWorkoutLogById,
  createWorkoutLog,
  updateWorkoutLog,
  deleteWorkoutLog,
};
