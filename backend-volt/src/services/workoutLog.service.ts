import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import {
  WORKOUT_LOG_DETAIL_INCLUDE,
  WORKOUT_LOG_SUMMARY_INCLUDE,
  type CreateWorkoutLogInput,
  type UpdateWorkoutLogInput,
} from "../types/workoutLog.dto.js";
import {
  toWorkoutLogDetailDto,
  toWorkoutLogSummaryDto,
} from "../mappers/workoutLog.mapper.js";

async function getAllWorkoutLogs(userId: string, page: number, limit: number) {
  const { workoutLogs, total } = await prisma.$transaction(async (tx) => {
    const workoutLogs = await tx.workoutLog.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      // createdAt as a secondary key gives same-day sessions a stable order
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: WORKOUT_LOG_SUMMARY_INCLUDE,
    });
    const total = await tx.workoutLog.count({ where: { userId } });

    return { workoutLogs, total };
  });
  return {
    workoutLogs: workoutLogs.map(toWorkoutLogSummaryDto),
    total,
    page,
    limit,
  };
}

// Return today's workout sessions as summaries (empty array if none yet). A day can
// hold multiple sessions (e.g. morning cardio + evening lifting), so this is a list,
// not a single log. The client sends its local date as YYYY-MM-DD; createWorkoutLog
// normalizes that to UTC midnight, so the same parse here lines both sides up on one
// instant — no timezone drift. Since same-day logs share that midnight instant, we
// order by createdAt (insertion order ≈ chronological) for a stable list.
async function getTodayWorkoutLogs(userId: string, date: string) {
  const logs = await prisma.workoutLog.findMany({
    where: { userId, date: new Date(date) },
    orderBy: { createdAt: "asc" },
    include: WORKOUT_LOG_SUMMARY_INCLUDE,
  });

  return logs.map(toWorkoutLogSummaryDto);
}

// Return a user's workout sessions whose `date` falls within [from, to] as
// summaries (each carrying its totalVolume), oldest first. Unpaginated: the
// dashboard's weekly volume card buckets these by weekday on the client.
async function getWorkoutLogsByRange(userId: string, from: Date, to: Date) {
  const logs = await prisma.workoutLog.findMany({
    where: { userId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
    include: WORKOUT_LOG_SUMMARY_INCLUDE,
  });

  return logs.map(toWorkoutLogSummaryDto);
}

async function getWorkoutLogById(userId: string, logId: string) {
  const workoutLog = await prisma.workoutLog.findUnique({
    where: { id: logId, userId },
    include: WORKOUT_LOG_DETAIL_INCLUDE,
  });

  if (!workoutLog) {
    throw new NotFoundError("Workout log not found.");
  }

  return toWorkoutLogDetailDto(workoutLog);
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

      const createdLog = await tx.workoutLog.create({
        data,
        include: WORKOUT_LOG_DETAIL_INCLUDE,
      });
      return toWorkoutLogDetailDto(createdLog);
    });
  }

  const createdWorkoutLog = await prisma.workoutLog.create({
    data,
    include: WORKOUT_LOG_DETAIL_INCLUDE,
  });
  return toWorkoutLogDetailDto(createdWorkoutLog);
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
        const updatedLog = await tx.workoutLog.update({
          where: { id: logId, userId },
          data,
          include: WORKOUT_LOG_DETAIL_INCLUDE,
        });
        return toWorkoutLogDetailDto(updatedLog);
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
      include: WORKOUT_LOG_DETAIL_INCLUDE,
    });
    return toWorkoutLogDetailDto(updatedLog);
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
  getTodayWorkoutLogs,
  getWorkoutLogsByRange,
  getWorkoutLogById,
  createWorkoutLog,
  updateWorkoutLog,
  deleteWorkoutLog,
};
