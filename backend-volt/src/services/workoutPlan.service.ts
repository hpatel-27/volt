import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../errors.js";
import type {
  CreateWorkoutPlanInput,
  UpdateWorkoutPlanInput,
} from "../types/workoutPlan.dto.js";

async function getAllWorkoutPlans(userId: number, page: number, limit: number) {
  const [workoutPlans, total] = await prisma.$transaction([
    prisma.workoutPlan.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.workoutPlan.count({ where: { userId } }),
  ]);
  return { workoutPlans, total, page, limit };
}

async function getWorkoutPlanById(userId: number, planId: number) {
  const workoutPlan = await prisma.workoutPlan.findUnique({
    where: { id: planId, userId },
    include: {
      workoutDays: {
        orderBy: { order: "asc" },
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: { exercise: true },
          },
        },
      },
    },
  });

  if (!workoutPlan) {
    throw new NotFoundError("Workout plan not found.");
  }

  return workoutPlan;
}

async function createWorkoutPlan(data: CreateWorkoutPlanInput) {
  const newPlan = await prisma.workoutPlan.create({ data });
  return newPlan;
}

async function updateWorkoutPlan(
  userId: number,
  planId: number,
  data: UpdateWorkoutPlanInput,
) {
  try {
    const updatedPlan = await prisma.workoutPlan.update({
      where: { id: planId, userId },
      data,
      include: {
        workoutDays: {
          orderBy: { order: "asc" },
          include: {
            exercises: {
              orderBy: { order: "asc" },
              include: { exercise: true },
            },
          },
        },
      },
    });
    return updatedPlan;
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

async function deleteWorkoutPlan(userId: number, planId: number) {
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
