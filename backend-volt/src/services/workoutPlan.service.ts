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
      orderBy: { createdAt: "desc" },
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
  const newPlan = await prisma.workoutPlan.create({
    data,
    include: { _count: { select: { workoutDays: true } } },
  });
  return toWorkoutPlanDto(newPlan);
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

export {
  getAllWorkoutPlans,
  getWorkoutPlanById,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
};
