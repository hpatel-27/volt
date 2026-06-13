import type { Request, Response } from "express";
import * as exerciseLogService from "../services/exerciseLog.service.js";
import type {
  CreateExerciseLogInput,
  UpdateExerciseLogInput,
} from "../types/exerciseLog.dto.js";
import { validateBoundedString } from "../helpers/validators.js";
import { LIMITS } from "../helpers/limits.js";

async function getAllExerciseLogs(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as string;

  const exerciseLogs = await exerciseLogService.getAllExerciseLogs(
    logId,
    userId,
  );
  res.json(exerciseLogs);
}

async function getExerciseLogById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as string;
  const exerciseLogId = res.locals.exerciseLogId as string;

  const exerciseLog = await exerciseLogService.getExerciseLogById(
    logId,
    userId,
    exerciseLogId,
  );
  res.json(exerciseLog);
}

async function createExerciseLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as string;
  const { exerciseId, notes } = req.body ?? {};

  const trimmedExerciseId = validateBoundedString(
    "exerciseId",
    exerciseId,
    LIMITS.ID_MAX,
  );

  const data: CreateExerciseLogInput = {
    workoutLogId: logId,
    exerciseId: trimmedExerciseId,
  };

  if (notes !== undefined) {
    const trimmedNotes = validateBoundedString(
      "notes",
      notes,
      LIMITS.NOTES_MAX,
    );
    data.notes = trimmedNotes;
  }

  const newExerciseLog = await exerciseLogService.createExerciseLog(
    logId,
    userId,
    data,
  );
  res.status(201).json(newExerciseLog);
}

async function updateExerciseLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as string;
  const exerciseLogId = res.locals.exerciseLogId as string;
  const { exerciseId, notes } = req.body ?? {};

  const data: UpdateExerciseLogInput = {};

  if (exerciseId !== undefined) {
    const trimmedExerciseId = validateBoundedString(
      "exerciseId",
      exerciseId,
      LIMITS.ID_MAX,
    );
    data.exerciseId = trimmedExerciseId;
  }

  if (notes !== undefined) {
    if (notes === null) {
      data.notes = notes;
    } else {
      const trimmedNotes = validateBoundedString(
        "notes",
        notes,
        LIMITS.NOTES_MAX,
      );
      data.notes = trimmedNotes;
    }
  }

  if (Object.keys(data).length === 0) {
    return res
      .status(400)
      .json({ error: "No valid fields were provided to update." });
  }

  const updated = await exerciseLogService.updateExerciseLog(
    logId,
    userId,
    exerciseLogId,
    data,
  );
  res.json(updated);
}

async function deleteExerciseLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as string;
  const exerciseLogId = res.locals.exerciseLogId as string;

  await exerciseLogService.deleteExerciseLog(logId, userId, exerciseLogId);
  return res.status(204).send();
}

export {
  getAllExerciseLogs,
  getExerciseLogById,
  createExerciseLog,
  updateExerciseLog,
  deleteExerciseLog,
};
