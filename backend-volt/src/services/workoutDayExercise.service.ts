import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { EXERCISE_REF_SELECT } from "../prisma/selects.js";
import { DuplicateEntryError, NotFoundError } from "../errors.js";
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
        include: { exercise: { select: EXERCISE_REF_SELECT } },
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
    include: { exercise: { select: EXERCISE_REF_SELECT } },
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
      include: { _count: { select: { exercises: true } } },
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

    // The new day for the plan will always be the newest/last in the order
    const lastExercise = await tx.workoutDayExercise.findFirst({
      where: { workoutDayId: existingDay.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const orderNumber = (lastExercise?.order ?? 0) + 1;
    try {
      const dayExercise = await tx.workoutDayExercise.create({
        data: { ...data, order: orderNumber },
        include: { exercise: { select: EXERCISE_REF_SELECT } },
      });

      // Nested update to the Workout Plan with no data
      // This updates the updatedAt field on the plan
      await tx.workoutPlan.update({ where: { id: planId }, data: {} });

      return toWorkoutDayExerciseDto(dayExercise);
    } catch (error: unknown) {
      // A concurrent insert may have claimed this order first, tripping the
      // @@unique([workoutDayId, order]) constraint.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new DuplicateEntryError(
          "A workout day exercise with this order already exists.",
          { cause: error },
        );
      }
      throw error;
    }
  });
}

async function updateWorkoutDayExercise(
  planId: string,
  dayId: string,
  userId: string,
  dayExerciseId: string,
  data: UpdateWorkoutDayExerciseInput,
) {
  return await prisma.$transaction(async (tx) => {
    try {
      const updated = await tx.workoutDayExercise.update({
        where: {
          id: dayExerciseId,
          workoutDayId: dayId,
          workoutDay: { workoutPlanId: planId, workoutPlan: { userId } },
        },
        data,
        include: { exercise: { select: EXERCISE_REF_SELECT } },
      });

      // Nested update to the Workout Plan with no data
      // This updates the updatedAt field on the plan
      await tx.workoutPlan.update({ where: { id: planId }, data: {} });

      return toWorkoutDayExerciseDto(updated);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Workout day exercise not found.", {
            cause: error,
          });
        }
        if (error.code === "P2003") {
          throw new NotFoundError("Referenced exercise not found.", {
            cause: error,
          });
        }
      }
      throw error;
    }
  });
}

async function deleteWorkoutDayExercise(
  planId: string,
  dayId: string,
  userId: string,
  dayExerciseId: string,
) {
  return await prisma.$transaction(async (tx) => {
    try {
      await tx.workoutDayExercise.delete({
        where: {
          id: dayExerciseId,
          workoutDayId: dayId,
          workoutDay: { workoutPlanId: planId, workoutPlan: { userId } },
        },
      });

      // Nested update to the Workout Plan with no data
      // This updates the updatedAt field on the plan
      await tx.workoutPlan.update({ where: { id: planId }, data: {} });

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
  });
}

export {
  getAllWorkoutDayExercises,
  getWorkoutDayExerciseById,
  createWorkoutDayExercise,
  updateWorkoutDayExercise,
  deleteWorkoutDayExercise,
};
