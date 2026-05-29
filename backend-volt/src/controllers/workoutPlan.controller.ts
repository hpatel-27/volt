import type { Request, Response } from "express";
import * as workoutPlanService from "../services/workoutPlan.service.js";
import {
  type CreateWorkoutPlanInput,
  type UpdateWorkoutPlanInput,
} from "../types/workoutPlan.dto.js";
import { PlanType } from "../generated/prisma/enums.js";

async function getAllWorkoutPlans(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { page, limit } = req.pagination!;

  const workoutPlans = await workoutPlanService.getAllWorkoutPlans(
    userId,
    page,
    limit,
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
  const name = req.body?.name;
  const type = req.body?.type;

  if (name === undefined || typeof name !== "string" || name.length < 1) {
    return res
      .status(400)
      .json({ error: "Name is required and cannot be empty." });
  }

  if (type !== undefined) {
    if (!Object.values(PlanType).includes(type)) {
      return res.status(400).json({
        error:
          "Invalid type was provided. STRENGTH, HYPERTROPHY, and WEIGHT LOSS are the only types currently supported.",
      });
    }
  }

  const data: CreateWorkoutPlanInput = { userId, name, type };
  const newPlan = await workoutPlanService.createWorkoutPlan(data);
  res.status(201).json(newPlan);
}

async function updateWorkoutPlan(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;
  const name = req.body?.name;
  const type = req.body?.type;

  const data: UpdateWorkoutPlanInput = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.length < 1) {
      return res.status(400).json({ error: "Name cannot be an empty string." });
    }
    data.name = name;
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
