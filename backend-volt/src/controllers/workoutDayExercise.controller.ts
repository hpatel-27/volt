import type { Request, Response } from "express";
import * as workoutDayExerciseService from "../services/workoutDayExercise.service.js";
import type {
  CreateWorkoutDayExerciseInput,
  UpdateWorkoutDayExerciseInput,
} from "../types/workoutDayExercise.dto.js";
import {
  validateBoundedString,
  validatePositiveInt,
  validateRange,
} from "../helpers/validators.js";
import { LIMITS } from "../helpers/limits.js";

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
  const { exerciseId, targetSets, targetRepsMin, targetRepsMax, restSeconds } =
    req.body ?? {};

  const trimmedExerciseId = validateBoundedString(
    "exerciseId",
    exerciseId,
    LIMITS.ID_MAX,
  );

  // Initially build data with required fields
  const data: CreateWorkoutDayExerciseInput = {
    workoutDayId: dayId,
    exerciseId: trimmedExerciseId,
    order: -1,
  };

  // Add optional fields after sanitization
  if (targetSets !== undefined) {
    validatePositiveInt("targetSets", targetSets, LIMITS.SETS_MAX);
    data.targetSets = targetSets;
  }

  if (targetRepsMin !== undefined) {
    validatePositiveInt("targetRepsMin", targetRepsMin, LIMITS.REPS_MAX);
    data.targetRepsMin = targetRepsMin;
  }

  if (targetRepsMax !== undefined) {
    validatePositiveInt("targetRepsMax", targetRepsMax, LIMITS.REPS_MAX);
    data.targetRepsMax = targetRepsMax;
  }

  validateRange(
    "targetRepsMin",
    data.targetRepsMin,
    "targetRepsMax",
    data.targetRepsMax,
  );

  if (restSeconds !== undefined) {
    validatePositiveInt("restSeconds", restSeconds, LIMITS.REST_MAX);
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

  const { exerciseId, targetSets, targetRepsMin, targetRepsMax, restSeconds } =
    req.body ?? {};

  const data: UpdateWorkoutDayExerciseInput = {};

  if (exerciseId !== undefined) {
    const trimmedExerciseId = validateBoundedString(
      "exerciseId",
      exerciseId,
      LIMITS.ID_MAX,
    );
    data.exerciseId = trimmedExerciseId;
  }

  if (targetSets !== undefined) {
    validatePositiveInt("targetSets", targetSets, LIMITS.SETS_MAX);
    data.targetSets = targetSets;
  }

  if (targetRepsMin !== undefined) {
    validatePositiveInt("targetRepsMin", targetRepsMin, LIMITS.REPS_MAX);
    data.targetRepsMin = targetRepsMin;
  }

  if (targetRepsMax !== undefined) {
    validatePositiveInt("targetRepsMax", targetRepsMax, LIMITS.REPS_MAX);
    data.targetRepsMax = targetRepsMax;
  }

  if (restSeconds !== undefined) {
    validatePositiveInt("restSeconds", restSeconds, LIMITS.REST_MAX);
    data.restSeconds = restSeconds;
  }

  if (Object.keys(data).length === 0) {
    return res
      .status(400)
      .json({ error: "No valid fields were provided to update." });
  }

  validateRange(
    "targetRepsMin",
    data.targetRepsMin,
    "targetRepsMax",
    data.targetRepsMax,
  );

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
