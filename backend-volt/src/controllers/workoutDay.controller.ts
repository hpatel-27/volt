import type { Request, Response } from "express";
import * as workoutDayService from "../services/workoutDay.service.js";
import type {
  CreateWorkoutDayInput,
  UpdateWorkoutDayInput,
} from "../types/workoutDay.dto.js";

async function getAllWorkoutDays(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as number;

  const days = await workoutDayService.getAllWorkoutDays(planId, userId);
  res.json(days);
}

async function getWorkoutDayById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as number;
  const dayId = res.locals.dayId as number;

  const day = await workoutDayService.getWorkoutDayById(planId, userId, dayId);
  res.json(day);
}

async function createWorkoutDay(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as number;
  const { name, order } = req.body;

  if (name === undefined || typeof name !== "string" || name.length < 1) {
    return res
      .status(400)
      .json({ error: "Name is required and cannot be empty." });
  }

  if (
    order === undefined ||
    typeof order !== "number" ||
    order < 1 ||
    !Number.isInteger(order)
  ) {
    return res
      .status(400)
      .json({ error: "Order is required and must be a positive integer." });
  }

  const data: CreateWorkoutDayInput = { workoutPlanId: planId, name, order };
  const newDay = await workoutDayService.createWorkoutDay(planId, userId, data);
  res.status(201).json(newDay);
}

async function updateWorkoutDay(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as number;
  const dayId = res.locals.dayId as number;
  const { name, order } = req.body;

  const data: UpdateWorkoutDayInput = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.length < 1) {
      return res.status(400).json({ error: "Name cannot be an empty string." });
    }
    data.name = name;
  }

  if (order !== undefined) {
    if (typeof order !== "number" || order < 1 || !Number.isInteger(order)) {
      return res
        .status(400)
        .json({ error: "Order must be a positive integer." });
    }
    data.order = order;
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
  const planId = res.locals.planId as number;
  const dayId = res.locals.dayId as number;

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
