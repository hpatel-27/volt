import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import {
  EXERCISE_LOG_DETAIL_INCLUDE,
  type CreateExerciseLogInput,
  type UpdateExerciseLogInput,
} from "../types/exerciseLog.dto.js";
import { EXERCISE_REF_SELECT } from "../prisma/selects.js";
import { toExerciseLogDto } from "../mappers/exerciseLog.mapper.js";

async function getAllExerciseLogs(logId: string, userId: string) {
  const workoutLog = await prisma.workoutLog.findUnique({
    where: { id: logId, userId },
    include: {
      exerciseLogs: {
        include: EXERCISE_LOG_DETAIL_INCLUDE,
      },
    },
  });

  if (!workoutLog) {
    throw new NotFoundError("Workout log not found.");
  }

  return { exerciseLogs: workoutLog.exerciseLogs.map(toExerciseLogDto) };
}

async function getExerciseLogById(
  logId: string,
  userId: string,
  exerciseLogId: string,
) {
  const exerciseLog = await prisma.exerciseLog.findFirst({
    where: {
      id: exerciseLogId,
      workoutLogId: logId,
      workoutLog: { userId },
    },
    include: EXERCISE_LOG_DETAIL_INCLUDE,
  });

  if (!exerciseLog) {
    throw new NotFoundError("Exercise log not found.");
  }

  return toExerciseLogDto(exerciseLog);
}

async function createExerciseLog(
  logId: string,
  userId: string,
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

    const newLog = await tx.exerciseLog.create({
      data,
      include: EXERCISE_LOG_DETAIL_INCLUDE,
    });
    return toExerciseLogDto(newLog);
  });
}

async function updateExerciseLog(
  logId: string,
  userId: string,
  exerciseLogId: string,
  data: UpdateExerciseLogInput,
) {
  try {
    const updatedLog = await prisma.exerciseLog.update({
      where: {
        id: exerciseLogId,
        workoutLogId: logId,
        workoutLog: { userId },
      },
      data,
      include: EXERCISE_LOG_DETAIL_INCLUDE,
    });
    return toExerciseLogDto(updatedLog);
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
  logId: string,
  userId: string,
  exerciseLogId: string,
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
