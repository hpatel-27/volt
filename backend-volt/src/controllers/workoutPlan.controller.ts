import type { Request, Response } from "express";
import * as workoutPlanService from "../services/workoutPlan.service.js";
import {
  type CreateWorkoutPlanInput,
  type UpdateWorkoutPlanInput,
} from "../types/workoutPlan.dto.js";
import { PlanType } from "../generated/prisma/enums.js";
import { validateBoundedString, validateEnum } from "../helpers/validators.js";
import { LIMITS } from "../helpers/limits.js";

async function getAllWorkoutPlans(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { page, limit } = req.pagination!;

  // `type` here is an OPTIONAL query-string filter (unlike create/update where it
  // is part of the body). When absent, the list shouldn't be filtered
  let type: PlanType | undefined;

  if (req.query?.type) {
    type = validateEnum(
      "type",
      req.query?.type,
      Object.values(PlanType),
    ) as PlanType;
  }

  const workoutPlans = await workoutPlanService.getAllWorkoutPlans(
    userId,
    page,
    limit,
    type,
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

  const data: CreateWorkoutPlanInput = { userId, name: trimmedName };

  if (type !== undefined) {
    data.type = validateEnum("type", type, Object.values(PlanType)) as PlanType;
  }
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
    data.type = validateEnum("type", type, Object.values(PlanType)) as PlanType;
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
