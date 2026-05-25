import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
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
        include: { exercise: { select: { slug: true, name: true } } },
      },
    },
  },
} satisfies Prisma.WorkoutPlanInclude;

// When listing the plans we don't need the nested workout day exercises
async function getAllWorkoutPlans(userId: string, page: number, limit: number) {
  const [rawPlans, total] = await prisma.$transaction([
    prisma.workoutPlan.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { workoutDays: true } } },
    }),
    prisma.workoutPlan.count({ where: { userId } }),
  ]);

  const workoutPlans = rawPlans.map((p) => toWorkoutPlanDto(p));
  return { workoutPlans, total, page, limit };
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
  // TODO(human): if this is the user's first workout plan, also set
  // user.activePlanId to the new plan's id. Both writes should happen
  // atomically so we never end up with a plan but no active pointer
  // (or worse, the count check disagreeing with the actual state under
  // concurrent creates). Return the plan DTO as before.
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
  try {
    await prisma.workoutPlan.delete({
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
  getWorkoutPlanById,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
  activateWorkoutPlan,
};
