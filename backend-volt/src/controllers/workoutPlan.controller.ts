import type { Request, Response } from "express";
import * as workoutPlanService from "../services/workoutPlan.service.js";
import {
  type CreateWorkoutPlanInput,
  type UpdateWorkoutPlanInput,
} from "../types/workoutPlan.dto.js";
import { PlanType } from "../generated/prisma/enums.js";
import { validateBoundedString } from "../helpers/validators.js";
import { LIMITS } from "../helpers/limits.js";

async function getAllWorkoutPlans(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { page, limit } = req.pagination!;
  const type = req.query.type;

  if (type !== undefined) {
    if (
      typeof type !== "string" ||
      !Object.values(PlanType).includes(type as PlanType)
    ) {
      return res.status(400).json({
        error:
          "Invalid type was provided. STRENGTH, HYPERTROPHY, and WEIGHT_LOSS are the only types currently supported.",
      });
    }
  }

  const workoutPlans = await workoutPlanService.getAllWorkoutPlans(
    userId,
    page,
    limit,
    type as PlanType | undefined,
  );
  res.json(workoutPlans);
}

async function getActiveWorkoutPlan(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;

  const activePlan = await workoutPlanService.getActiveWorkoutPlan(userId);
  res.json(activePlan);
}

async function getWorkoutPlanById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;

  const workoutPlan = await workoutPlanService.getWorkoutPlanById(
    userId,
    planId,
  );
  res.json(workoutPlan);
}

async function createWorkoutPlan(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { name, type } = req.body ?? {};

  const trimmedName = validateBoundedString("name", name, LIMITS.NAME_MAX);

  if (type !== undefined) {
    if (!Object.values(PlanType).includes(type)) {
      return res.status(400).json({
        error:
          "Invalid type was provided. STRENGTH, HYPERTROPHY, and WEIGHT LOSS are the only types currently supported.",
      });
    }
  }

  const data: CreateWorkoutPlanInput = { userId, name: trimmedName, type };
  const newPlan = await workoutPlanService.createWorkoutPlan(data);
  res.status(201).json(newPlan);
}

async function updateWorkoutPlan(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;
  const { name, type } = req.body ?? {};

  const data: UpdateWorkoutPlanInput = {};

  if (name !== undefined) {
    const trimmedName = validateBoundedString("name", name, LIMITS.NAME_MAX);
    data.name = trimmedName;
  }

  if (type !== undefined) {
    if (!Object.values(PlanType).includes(type)) {
      return res.status(400).json({
        error:
          "Invalid type was provided. STRENGTH, HYPERTROPHY, and WEIGHT LOSS are the only types currently supported.",
      });
    }
    data.type = type;
  }

  if (Object.keys(data).length === 0) {
    return res
      .status(400)
      .json({ error: "No valid fields were provided to update." });
  }

  const updatedPlan = await workoutPlanService.updateWorkoutPlan(
    userId,
    planId,
    data,
  );
  res.json(updatedPlan);
}

async function deleteWorkoutPlan(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;

  await workoutPlanService.deleteWorkoutPlan(userId, planId);
  return res.status(204).send();
}

async function activateWorkoutPlan(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;

  const activePlan = await workoutPlanService.activateWorkoutPlan(
    userId,
    planId,
  );
  return res.json(activePlan);
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
