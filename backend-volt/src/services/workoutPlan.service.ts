import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { EXERCISE_REF_SELECT } from "../prisma/selects.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import type {
  CreateWorkoutPlanInput,
  UpdateWorkoutPlanInput,
} from "../types/workoutPlan.dto.js";
import {
  toWorkoutPlanDto,
  toWorkoutPlanDetailDto,
} from "../mappers/workoutPlan.mapper.js";

const planDetailInclude = {
  workoutDays: {
    orderBy: { order: "asc" },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: { select: EXERCISE_REF_SELECT } },
      },
    },
  },
} satisfies Prisma.WorkoutPlanInclude;

// When listing the plans we don't need the nested workout day exercises
async function getAllWorkoutPlans(userId: string, page: number, limit: number) {
  const [rawPlans, total] = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { activePlanId: true },
    });
    if (!user) {
      throw new NotFoundError("User not found.");
    }
    // If there's no active plan, it won't match to any existing plan to exclude anyway
    const activePlanId = user.activePlanId;

    const rawPlans = await tx.workoutPlan.findMany({
      where: { userId, ...(activePlanId && { id: { not: activePlanId } }) },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { workoutDays: true } } },
    });
    const total = await tx.workoutPlan.count({
      where: { userId, ...(activePlanId && { id: { not: activePlanId } }) },
    });

    return [rawPlans, total];
  });

  const workoutPlans = rawPlans.map((p) => toWorkoutPlanDto(p));
  return { workoutPlans, total, page, limit };
}

async function getActiveWorkoutPlan(userId: string) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { activePlanId: true },
    });
    // There's no active plan, we don't want to render this
    const activePlanId = user?.activePlanId;
    if (!activePlanId) {
      return null;
    }

    const matchingPlan = await tx.workoutPlan.findUnique({
      where: { id: activePlanId },
      include: { _count: { select: { workoutDays: true } } },
    });

    if (!matchingPlan) {
      throw new NotFoundError("User has an active plan, but it was not found.");
    }
    return toWorkoutPlanDto(matchingPlan);
  });
}

async function getWorkoutPlanById(userId: string, planId: string) {
  const workoutPlan = await prisma.workoutPlan.findUnique({
    where: { id: planId, userId },
    include: planDetailInclude,
  });

  if (!workoutPlan) {
    throw new NotFoundError("Workout plan not found.");
  }

  return toWorkoutPlanDetailDto(workoutPlan);
}

async function createWorkoutPlan(data: CreateWorkoutPlanInput) {
  const { plan } = await prisma.$transaction(async (tx) => {
    const plan = await tx.workoutPlan.create({
      data,
      include: { _count: { select: { workoutDays: true } } },
    });

    const count = await tx.workoutPlan.count({
      where: { userId: data.userId },
    });
    // If this is the user's first plan (or they deleted their plans and they are making a new first plan)
    if (count === 1) {
      await tx.user.update({
        where: { id: data.userId },
        data: { activePlanId: plan.id },
      });
    }
    return { plan };
  });

  return toWorkoutPlanDto(plan);
}

async function updateWorkoutPlan(
  userId: string,
  planId: string,
  data: UpdateWorkoutPlanInput,
) {
  try {
    const updatedPlan = await prisma.workoutPlan.update({
      where: { id: planId, userId },
      data,
      include: planDetailInclude,
    });
    return toWorkoutPlanDetailDto(updatedPlan);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Workout plan not found.", { cause: error });
    }
    throw error;
  }
}

async function deleteWorkoutPlan(userId: string, planId: string) {
  return await prisma.$transaction(async (tx) => {
    try {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { activePlanId: true },
      });
      // There's no active plan, we don't want to render this
      const activePlanId = user?.activePlanId;
      if (activePlanId === planId) {
        throw new BadRequestError("Active workout plan cannot be deleted.");
      }

      await tx.workoutPlan.delete({
        where: { id: planId, userId },
      });
      return;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundError("Workout plan not found.", { cause: error });
      }
      throw error;
    }
  });
}

async function activateWorkoutPlan(userId: string, planId: string) {
  await prisma.$transaction(async (tx) => {
    const workoutPlan = await tx.workoutPlan.findUnique({
      where: { id: planId, userId },
    });

    if (!workoutPlan) {
      throw new NotFoundError("Workout plan not found.");
    }

    await tx.user.update({
      where: { id: userId },
      data: { activePlanId: planId },
    });
  });
  return { activePlanId: planId };
}

export {
  getAllWorkoutPlans,
  getActiveWorkoutPlan,
  getWorkoutPlanById,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
  activateWorkoutPlan,
};
