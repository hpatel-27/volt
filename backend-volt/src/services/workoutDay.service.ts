import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import type {
  CreateWorkoutDayInput,
  UpdateWorkoutDayInput,
} from "../types/workoutDay.dto.js";

async function getAllWorkoutDays(planId: number, userId: number) {
  const plan = await prisma.workoutPlan.findUnique({
    where: { id: planId, userId },
    include: {
      workoutDays: { orderBy: { order: "asc" } },
    },
  });

  if (!plan) {
    throw new NotFoundError("Workout plan not found.");
  }

  return { workoutDays: plan.workoutDays };
}

async function getWorkoutDayById(
  planId: number,
  userId: number,
  dayId: number,
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

  return day;
}

async function createWorkoutDay(
  planId: number,
  userId: number,
  data: CreateWorkoutDayInput,
) {
  return await prisma.$transaction(async (tx) => {
    const existingPlan = await tx.workoutPlan.findUnique({
      where: { id: planId, userId },
    });
    if (!existingPlan) {
      throw new NotFoundError("Workout plan not found.");
    }

    return await tx.workoutDay.create({ data });
  });
}

async function updateWorkoutDay(
  planId: number,
  userId: number,
  dayId: number,
  data: UpdateWorkoutDayInput,
) {
  try {
    const updatedDay = await prisma.workoutDay.update({
      where: {
        id: dayId,
        workoutPlanId: planId,
        workoutPlan: { userId },
      },
      data,
    });
    return updatedDay;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Workout day not found.", { cause: error });
    }
    throw error;
  }
}

async function deleteWorkoutDay(
  planId: number,
  userId: number,
  dayId: number,
) {
  try {
    await prisma.workoutDay.delete({
      where: {
        id: dayId,
        workoutPlanId: planId,
        workoutPlan: { userId },
      },
    });
    return;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Workout day not found.", { cause: error });
    }
    throw error;
  }
}

export {
  getAllWorkoutDays,
  getWorkoutDayById,
  createWorkoutDay,
  updateWorkoutDay,
  deleteWorkoutDay,
};
