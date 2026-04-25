import type { Request, Response } from "express";
import * as workoutDayExerciseService from "../services/workoutDayExercise.service.js";
import type {
  CreateWorkoutDayExerciseInput,
  UpdateWorkoutDayExerciseInput,
} from "../types/workoutDayExercise.dto.js";

async function getAllWorkoutDayExercises(req: Request, res: Response) {
  const userId = req.user!.id;
  const planId = res.locals.planId as number;
  const dayId = res.locals.dayId as number;

  const exercises = await workoutDayExerciseService.getAllWorkoutDayExercises(
    planId,
    dayId,
    userId,
  );
  res.json(exercises);
}

async function createWorkoutDayExercise(req: Request, res: Response) {
  const userId = req.user!.id;
  const planId = res.locals.planId as number;
  const dayId = res.locals.dayId as number;
  const { exerciseId, order } = req.body;

  if (
    exerciseId === undefined ||
    typeof exerciseId !== "string" ||
    exerciseId.length < 1
  ) {
    return res
      .status(400)
      .json({ error: "exerciseId is required and cannot be empty." });
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

  const data: CreateWorkoutDayExerciseInput = {
    workoutDayId: dayId,
    exerciseId,
    order,
  };
  const newExercise = await workoutDayExerciseService.createWorkoutDayExercise(
    planId,
    dayId,
    userId,
    data,
  );
  res.status(201).json(newExercise);
}

async function updateWorkoutDayExercise(req: Request, res: Response) {
  const userId = req.user!.id;
  const planId = res.locals.planId as number;
  const dayId = res.locals.dayId as number;
  const dayExerciseId = res.locals.dayExerciseId as number;
  const { order } = req.body;

  const data: UpdateWorkoutDayExerciseInput = {};

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

  const updated = await workoutDayExerciseService.updateWorkoutDayExercise(
    planId,
    dayId,
    userId,
    dayExerciseId,
    data,
  );
  res.json(updated);
}

async function deleteWorkoutDayExercise(req: Request, res: Response) {
  const userId = req.user!.id;
  const planId = res.locals.planId as number;
  const dayId = res.locals.dayId as number;
  const dayExerciseId = res.locals.dayExerciseId as number;

  await workoutDayExerciseService.deleteWorkoutDayExercise(
    planId,
    dayId,
    userId,
    dayExerciseId,
  );
  return res.status(204).send();
}

export {
  getAllWorkoutDayExercises,
  createWorkoutDayExercise,
  updateWorkoutDayExercise,
  deleteWorkoutDayExercise,
};
