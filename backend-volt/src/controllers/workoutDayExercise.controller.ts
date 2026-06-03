import type { Request, Response } from "express";
import * as workoutDayExerciseService from "../services/workoutDayExercise.service.js";
import type {
  CreateWorkoutDayExerciseInput,
  UpdateWorkoutDayExerciseInput,
} from "../types/workoutDayExercise.dto.js";
import { validatePositiveInt } from "../helpers/validators.js";

async function getAllWorkoutDayExercises(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;
  const dayId = res.locals.dayId as string;

  const exercises = await workoutDayExerciseService.getAllWorkoutDayExercises(
    planId,
    dayId,
    userId,
  );
  res.json(exercises);
}

async function getWorkoutDayExerciseById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;
  const dayId = res.locals.dayId as string;
  const dayExerciseId = res.locals.dayExerciseId as string;

  const exercise = await workoutDayExerciseService.getWorkoutDayExerciseById(
    planId,
    dayId,
    dayExerciseId,
    userId,
  );
  res.json(exercise);
}

async function createWorkoutDayExercise(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;
  const dayId = res.locals.dayId as string;
  const exerciseId = req.body?.exerciseId;

  const targetSets = req.body?.targetSets;
  const targetRepsMin = req.body?.targetRepsMin;
  const targetRepsMax = req.body?.targetRepsMax;
  const restSeconds = req.body?.restSeconds;

  if (
    exerciseId === undefined ||
    typeof exerciseId !== "string" ||
    exerciseId.length < 1
  ) {
    return res
      .status(400)
      .json({ error: "exerciseId is required and cannot be empty." });
  }

  // Initially build data with required fields
  const data: CreateWorkoutDayExerciseInput = {
    workoutDayId: dayId,
    exerciseId,
    order: -1,
  };

  // Add optional fields after sanitization
  if (targetSets !== undefined) {
    validatePositiveInt("targetSets", targetSets);
    data.targetSets = targetSets;
  }

  if (targetRepsMin !== undefined) {
    validatePositiveInt("targetRepsMin", targetRepsMin);
    data.targetRepsMin = targetRepsMin;
  }

  if (targetRepsMax !== undefined) {
    validatePositiveInt("targetRepsMax", targetRepsMax);
    data.targetRepsMax = targetRepsMax;
  }

  if (restSeconds !== undefined) {
    validatePositiveInt("restSeconds", restSeconds);
    data.restSeconds = restSeconds;
  }

  const newExercise = await workoutDayExerciseService.createWorkoutDayExercise(
    planId,
    dayId,
    userId,
    data,
  );
  res.status(201).json(newExercise);
}

async function updateWorkoutDayExercise(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;
  const dayId = res.locals.dayId as string;
  const dayExerciseId = res.locals.dayExerciseId as string;

  const exerciseId = req.body?.exerciseId;
  const targetSets = req.body?.targetSets;
  const targetRepsMin = req.body?.targetRepsMin;
  const targetRepsMax = req.body?.targetRepsMax;
  const restSeconds = req.body?.restSeconds;

  const data: UpdateWorkoutDayExerciseInput = {};

  if (exerciseId !== undefined) {
    if (typeof exerciseId !== "string" || exerciseId.trim() === "") {
      return res
        .status(400)
        .json({ error: "Exercise id must be a non-empty string." });
    }
    data.exerciseId = exerciseId;
  }

  if (targetSets !== undefined) {
    validatePositiveInt("targetSets", targetSets);
    data.targetSets = targetSets;
  }

  if (targetRepsMin !== undefined) {
    validatePositiveInt("targetRepsMin", targetRepsMin);
    data.targetRepsMin = targetRepsMin;
  }

  if (targetRepsMax !== undefined) {
    validatePositiveInt("targetRepsMax", targetRepsMax);
    data.targetRepsMax = targetRepsMax;
  }

  if (restSeconds !== undefined) {
    validatePositiveInt("restSeconds", restSeconds);
    data.restSeconds = restSeconds;
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
  const user = req.user!;
  const userId = user.id;
  const planId = res.locals.planId as string;
  const dayId = res.locals.dayId as string;
  const dayExerciseId = res.locals.dayExerciseId as string;

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
  getWorkoutDayExerciseById,
  createWorkoutDayExercise,
  updateWorkoutDayExercise,
  deleteWorkoutDayExercise,
};
