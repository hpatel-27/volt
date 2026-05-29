import type { Request, Response } from "express";
import * as workoutDayService from "../services/workoutDay.service.js";
import type {
  CreateWorkoutDayInput,
  UpdateWorkoutDayInput,
} from "../types/workoutDay.dto.js";

async function getAllWorkoutDays(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;

  const days = await workoutDayService.getAllWorkoutDays(planId, userId);
  res.json(days);
}

async function getWorkoutDayById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;
  const dayId = res.locals.dayId as string;

  const day = await workoutDayService.getWorkoutDayById(planId, userId, dayId);
  res.json(day);
}

async function createWorkoutDay(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;
  const name = req.body?.name;

  if (name === undefined || typeof name !== "string" || name.length < 1) {
    return res
      .status(400)
      .json({ error: "Name is required and cannot be empty." });
  }

  const data: CreateWorkoutDayInput = {
    workoutPlanId: planId,
    name,
    order: -1,
  };
  const newDay = await workoutDayService.createWorkoutDay(planId, userId, data);
  res.status(201).json(newDay);
}

async function updateWorkoutDay(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;
  const dayId = res.locals.dayId as string;
  const name = req.body?.name;

  const data: UpdateWorkoutDayInput = {};

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

  const updatedDay = await workoutDayService.updateWorkoutDay(
    planId,
    userId,
    dayId,
    data,
  );
  res.json(updatedDay);
}

async function deleteWorkoutDay(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;
  const dayId = res.locals.dayId as string;

  await workoutDayService.deleteWorkoutDay(planId, userId, dayId);
  return res.status(204).send();
}

export {
  getAllWorkoutDays,
  getWorkoutDayById,
  createWorkoutDay,
  updateWorkoutDay,
  deleteWorkoutDay,
};
