import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import type {
  CreateWorkoutDayInput,
  UpdateWorkoutDayInput,
} from "../types/workoutDay.dto.js";
import {
  toWorkoutDayDto,
  toWorkoutDayDetailDto,
} from "../mappers/workoutDay.mapper.js";

async function getAllWorkoutDays(planId: string, userId: string) {
  const plan = await prisma.workoutPlan.findUnique({
    where: { id: planId, userId },
    include: {
      workoutDays: { orderBy: { order: "asc" } },
    },
  });

  if (!plan) {
    throw new NotFoundError("Workout plan not found.");
  }

  const workoutDays = plan.workoutDays.map((w) => toWorkoutDayDto(w));
  return { workoutDays };
}

async function getWorkoutDayById(
  planId: string,
  userId: string,
  dayId: string,
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

  return toWorkoutDayDetailDto(day);
}

async function createWorkoutDay(
  planId: string,
  userId: string,
  data: CreateWorkoutDayInput,
) {
  return await prisma.$transaction(async (tx) => {
    const existingPlan = await tx.workoutPlan.findUnique({
      where: { id: planId, userId },
      include: { _count: { select: { workoutDays: true } } },
    });

    if (!existingPlan) {
      throw new NotFoundError("Workout plan not found.");
    }

    // The new day for the plan will always be the newest/last in the order
    const days = existingPlan._count.workoutDays;
    data.order = days + 1;
    const day = await tx.workoutDay.create({ data });
    return toWorkoutDayDto(day);
  });
}

async function updateWorkoutDay(
  planId: string,
  userId: string,
  dayId: string,
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
      include: {
        exercises: {
          orderBy: { order: "asc" },
          include: { exercise: { select: { slug: true, name: true } } },
        },
      },
    });
    return toWorkoutDayDetailDto(updatedDay);
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

async function deleteWorkoutDay(planId: string, userId: string, dayId: string) {
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
