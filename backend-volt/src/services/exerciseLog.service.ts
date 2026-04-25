import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import type {
  CreateExerciseLogInput,
  UpdateExerciseLogInput,
} from "../types/exerciseLog.dto.js";

async function getAllExerciseLogs(logId: number, userId: number) {
  const workoutLog = await prisma.workoutLog.findUnique({
    where: { id: logId, userId },
    include: {
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

  return { exerciseLogs: workoutLog.exerciseLogs };
}

async function getExerciseLogById(
  logId: number,
  userId: number,
  exerciseLogId: number,
) {
  const exerciseLog = await prisma.exerciseLog.findFirst({
    where: {
      id: exerciseLogId,
      workoutLogId: logId,
      workoutLog: { userId },
    },
    include: {
      exercise: true,
      sets: { orderBy: { setNumber: "asc" } },
    },
  });

  if (!exerciseLog) {
    throw new NotFoundError("Exercise log not found.");
  }

  return exerciseLog;
}

async function createExerciseLog(
  logId: number,
  userId: number,
  data: CreateExerciseLogInput,
) {
  return await prisma.$transaction(async (tx) => {
    const existingLog = await tx.workoutLog.findUnique({
      where: { id: logId, userId },
    });
    if (!existingLog) {
      throw new NotFoundError("Workout log not found.");
    }

    const existingExercise = await tx.exercise.findUnique({
      where: { id: data.exerciseId },
    });
    if (!existingExercise) {
      throw new NotFoundError("Exercise not found.");
    }

    return await tx.exerciseLog.create({
      data,
      include: { exercise: true },
    });
  });
}

async function updateExerciseLog(
  logId: number,
  userId: number,
  exerciseLogId: number,
  data: UpdateExerciseLogInput,
) {
  try {
    const updated = await prisma.exerciseLog.update({
      where: {
        id: exerciseLogId,
        workoutLogId: logId,
        workoutLog: { userId },
      },
      data,
    });
    return updated;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Exercise log not found.", { cause: error });
    }
    throw error;
  }
}

async function deleteExerciseLog(
  logId: number,
  userId: number,
  exerciseLogId: number,
) {
  try {
    await prisma.exerciseLog.delete({
      where: {
        id: exerciseLogId,
        workoutLogId: logId,
        workoutLog: { userId },
      },
    });
    return;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Exercise log not found.", { cause: error });
    }
    throw error;
  }
}

export {
  getAllExerciseLogs,
  getExerciseLogById,
  createExerciseLog,
  updateExerciseLog,
  deleteExerciseLog,
};
