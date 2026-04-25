import type { Request, Response } from "express";
import * as workoutPlanService from "../services/workoutPlan.service.js";
import type {
  CreateWorkoutPlanInput,
  UpdateWorkoutPlanInput,
} from "../types/workoutPlan.dto.js";

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

async function getWorkoutPlanById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as number;

  const workoutPlan = await workoutPlanService.getWorkoutPlanById(
    userId,
    planId,
  );
  res.json(workoutPlan);
}

async function createWorkoutPlan(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { name } = req.body;

  if (name === undefined || typeof name !== "string" || name.length < 1) {
    return res
      .status(400)
      .json({ error: "Name is required and cannot be empty." });
  }

  const data: CreateWorkoutPlanInput = { userId, name };
  const newPlan = await workoutPlanService.createWorkoutPlan(data);
  res.status(201).json(newPlan);
}

async function updateWorkoutPlan(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as number;
  const { name } = req.body;

  const data: UpdateWorkoutPlanInput = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.length < 1) {
      return res.status(400).json({ error: "Name cannot be an empty string." });
    }
    data.name = name;
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
  const planId = res.locals.planId as number;

  await workoutPlanService.deleteWorkoutPlan(userId, planId);
  return res.status(204).send();
}

export {
  getAllWorkoutPlans,
  getWorkoutPlanById,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
};
