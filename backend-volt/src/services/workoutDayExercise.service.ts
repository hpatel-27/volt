import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import type {
  CreateWorkoutDayExerciseInput,
  UpdateWorkoutDayExerciseInput,
} from "../types/workoutDayExercise.dto.js";
import { toWorkoutDayExerciseDto } from "../mappers/workoutDayExercise.mapper.js";

async function getAllWorkoutDayExercises(
  planId: string,
  dayId: string,
  userId: string,
) {
  const day = await prisma.workoutDay.findFirst({
    where: { id: dayId, workoutPlanId: planId, workoutPlan: { userId } },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: { select: { slug: true, name: true } } },
      },
    },
  });

  if (!day) {
    throw new NotFoundError("Workout day not found.");
  }
  const exercises = day.exercises.map((e) => toWorkoutDayExerciseDto(e));
  return { exercises };
}

async function getWorkoutDayExerciseById(
  planId: string,
  dayId: string,
  dayExerciseId: string,
  userId: string,
) {
  const dayExercise = await prisma.workoutDayExercise.findFirst({
    where: {
      id: dayExerciseId,
      workoutDayId: dayId,
      workoutDay: { workoutPlanId: planId, workoutPlan: { userId } },
    },
    include: { exercise: { select: { slug: true, name: true } } },
  });

  if (!dayExercise) {
    throw new NotFoundError(
      `Workout day exercise with id: ${dayExerciseId} not found.`,
    );
  }

  return toWorkoutDayExerciseDto(dayExercise);
}

async function createWorkoutDayExercise(
  planId: string,
  dayId: string,
  userId: string,
  data: CreateWorkoutDayExerciseInput,
) {
  return await prisma.$transaction(async (tx) => {
    const existingDay = await tx.workoutDay.findFirst({
      where: { id: dayId, workoutPlanId: planId, workoutPlan: { userId } },
    });
    if (!existingDay) {
      throw new NotFoundError("Workout day not found.");
    }

    const existingExercise = await tx.exercise.findUnique({
      where: { id: data.exerciseId },
    });
    if (!existingExercise) {
      throw new NotFoundError("Exercise not found.");
    }

    const dayExercise = await tx.workoutDayExercise.create({
      data,
      include: { exercise: { select: { slug: true, name: true } } },
    });
    return toWorkoutDayExerciseDto(dayExercise);
  });
}

async function updateWorkoutDayExercise(
  planId: string,
  dayId: string,
  userId: string,
  dayExerciseId: string,
  data: UpdateWorkoutDayExerciseInput,
) {
  try {
    const updated = await prisma.workoutDayExercise.update({
      where: {
        id: dayExerciseId,
        workoutDayId: dayId,
        workoutDay: { workoutPlanId: planId, workoutPlan: { userId } },
      },
      data,
      include: { exercise: { select: { slug: true, name: true } } },
    });
    return toWorkoutDayExerciseDto(updated);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Workout day exercise not found.", {
        cause: error,
      });
    }
    throw error;
  }
}

async function deleteWorkoutDayExercise(
  planId: string,
  dayId: string,
  userId: string,
  dayExerciseId: string,
) {
  try {
    await prisma.workoutDayExercise.delete({
      where: {
        id: dayExerciseId,
        workoutDayId: dayId,
        workoutDay: { workoutPlanId: planId, workoutPlan: { userId } },
      },
    });
    return;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Workout day exercise not found.", {
        cause: error,
      });
    }
    throw error;
  }
}

export {
  getAllWorkoutDayExercises,
  getWorkoutDayExerciseById,
  createWorkoutDayExercise,
  updateWorkoutDayExercise,
  deleteWorkoutDayExercise,
};
