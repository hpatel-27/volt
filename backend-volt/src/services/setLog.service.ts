import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { DuplicateEntryError, NotFoundError } from "../errors.js";
import type {
  CreateSetLogInput,
  UpdateSetLogInput,
} from "../types/setLog.dto.js";
import { toSetLogDto } from "../mappers/setLog.mapper.js";

async function getAllSetLogs(
  logId: string,
  exerciseLogId: string,
  userId: string,
) {
  const exerciseLog = await prisma.exerciseLog.findFirst({
    where: {
      id: exerciseLogId,
      workoutLogId: logId,
      workoutLog: { userId },
    },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
    },
  });

  if (!exerciseLog) {
    throw new NotFoundError("Exercise log not found.");
  }

  return { sets: exerciseLog.sets.map(toSetLogDto) };
}

async function getSetById(userId: string, setId: string) {
  const set = await prisma.setLog.findFirst({
    where: {
      id: setId,
      exerciseLog: {
        workoutLog: { userId },
      },
    },
  });

  if (!set) {
    throw new NotFoundError("Set not found.");
  }

  return toSetLogDto(set);
}

async function createSetLog(
  logId: string,
  exerciseLogId: string,
  userId: string,
  data: CreateSetLogInput,
) {
  return await prisma.$transaction(async (tx) => {
    const existingExerciseLog = await tx.exerciseLog.findFirst({
      where: {
        id: exerciseLogId,
        workoutLogId: logId,
        workoutLog: { userId },
      },
    });
    if (!existingExerciseLog) {
      throw new NotFoundError("Exercise log not found.");
    }

    // The new set for the exercise log will always be the newest/last in the order
    const last = await tx.setLog.findFirst({
      where: { exerciseLogId },
      orderBy: { setNumber: "desc" },
      select: { setNumber: true },
    });
    const setNumber = (last?.setNumber ?? 0) + 1;
    try {
      const createdLog = await tx.setLog.create({
        data: { ...data, setNumber },
      });
      return toSetLogDto(createdLog);
    } catch (error: unknown) {
      // A concurrent insert may have claimed this setNumber first, tripping the
      // @@unique([exerciseLogId, setNumber]) constraint.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new DuplicateEntryError(
          "A set with this set number already exists.",
          { cause: error },
        );
      }
      throw error;
    }
  });
}

async function updateSetLog(
  userId: string,
  setId: string,
  data: UpdateSetLogInput,
) {
  try {
    const updated = await prisma.setLog.update({
      where: {
        id: setId,
        exerciseLog: {
          workoutLog: { userId },
        },
      },
      data,
    });
    return toSetLogDto(updated);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Set not found.", { cause: error });
    }
    throw error;
  }
}

async function deleteSetLog(userId: string, setId: string) {
  try {
    await prisma.setLog.delete({
      where: {
        id: setId,
        exerciseLog: {
          workoutLog: { userId },
        },
      },
    });
    return;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Set not found.", { cause: error });
    }
    throw error;
  }
}

export { getAllSetLogs, getSetById, createSetLog, updateSetLog, deleteSetLog };
