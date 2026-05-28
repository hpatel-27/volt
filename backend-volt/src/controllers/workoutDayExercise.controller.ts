import type { Request, Response } from "express";
import * as workoutDayExerciseService from "../services/workoutDayExercise.service.js";
import type {
  CreateWorkoutDayExerciseInput,
  UpdateWorkoutDayExerciseInput,
} from "../types/workoutDayExercise.dto.js";

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
    if (
      typeof targetSets !== "number" ||
      targetSets < 1 ||
      !Number.isInteger(targetSets)
    ) {
      return res
        .status(400)
        .json({ error: "Target sets must be a positive integer." });
    }
    data.targetSets = targetSets;
  }

  if (targetRepsMin !== undefined) {
    if (
      typeof targetRepsMin !== "number" ||
      targetRepsMin < 1 ||
      !Number.isInteger(targetRepsMin)
    ) {
      return res
        .status(400)
        .json({ error: "Minimum target reps must be a positive integer." });
    }
    data.targetRepsMin = targetRepsMin;
  }

  if (targetRepsMax !== undefined) {
    if (
      typeof targetRepsMax !== "number" ||
      targetRepsMax < 1 ||
      !Number.isInteger(targetRepsMax)
    ) {
      return res
        .status(400)
        .json({ error: "Max target reps must be a positive integer." });
    }
    data.targetRepsMax = targetRepsMax;
  }

  if (restSeconds !== undefined) {
    if (
      typeof restSeconds !== "number" ||
      restSeconds < 1 ||
      !Number.isInteger(restSeconds)
    ) {
      return res
        .status(400)
        .json({ error: "Rest seconds must be a positive integer." });
    }
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
    if (
      typeof targetSets !== "number" ||
      targetSets < 1 ||
      !Number.isInteger(targetSets)
    ) {
      return res
        .status(400)
        .json({ error: "Target sets must be a positive integer." });
    }
    data.targetSets = targetSets;
  }

  if (targetRepsMin !== undefined) {
    if (
      typeof targetRepsMin !== "number" ||
      targetRepsMin < 1 ||
      !Number.isInteger(targetRepsMin)
    ) {
      return res
        .status(400)
        .json({ error: "Minimum target reps must be a positive integer." });
    }
    data.targetRepsMin = targetRepsMin;
  }

  if (targetRepsMax !== undefined) {
    if (
      typeof targetRepsMax !== "number" ||
      targetRepsMax < 1 ||
      !Number.isInteger(targetRepsMax)
    ) {
      return res
        .status(400)
        .json({ error: "Max target reps must be a positive integer." });
    }
    data.targetRepsMax = targetRepsMax;
  }

  if (restSeconds !== undefined) {
    if (
      typeof restSeconds !== "number" ||
      restSeconds < 1 ||
      !Number.isInteger(restSeconds)
    ) {
      return res
        .status(400)
        .json({ error: "Rest seconds must be a positive integer." });
    }
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
