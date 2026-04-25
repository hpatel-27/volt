import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import type {
  CreateWorkoutDayExerciseInput,
  UpdateWorkoutDayExerciseInput,
} from "../types/workoutDayExercise.dto.js";

async function getAllWorkoutDayExercises(
  planId: number,
  dayId: number,
  userId: number,
) {
  const day = await prisma.workoutDay.findFirst({
    where: { id: dayId, workoutPlanId: planId, workoutPlan: { userId } },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: true },
      },
    },
  });

  if (!day) {
    throw new NotFoundError("Workout day not found.");
  }

  return { exercises: day.exercises };
}

async function createWorkoutDayExercise(
  planId: number,
  dayId: number,
  userId: number,
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

    return await tx.workoutDayExercise.create({
      data,
      include: { exercise: true },
    });
  });
}

async function updateWorkoutDayExercise(
  planId: number,
  dayId: number,
  userId: number,
  dayExerciseId: number,
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
      include: { exercise: true },
    });
    return updated;
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
  planId: number,
  dayId: number,
  userId: number,
  dayExerciseId: number,
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
  createWorkoutDayExercise,
  updateWorkoutDayExercise,
  deleteWorkoutDayExercise,
};
