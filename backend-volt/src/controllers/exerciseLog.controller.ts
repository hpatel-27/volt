import type { Request, Response } from "express";
import * as exerciseLogService from "../services/exerciseLog.service.js";
import type {
  CreateExerciseLogInput,
  UpdateExerciseLogInput,
} from "../types/exerciseLog.dto.js";

async function getAllExerciseLogs(req: Request, res: Response) {
  const userId = req.user!.id;
  const logId = res.locals.logId as number;

  const exerciseLogs = await exerciseLogService.getAllExerciseLogs(
    logId,
    userId,
  );
  res.json(exerciseLogs);
}

async function getExerciseLogById(req: Request, res: Response) {
  const userId = req.user!.id;
  const logId = res.locals.logId as number;
  const exerciseLogId = res.locals.exerciseLogId as number;

  const exerciseLog = await exerciseLogService.getExerciseLogById(
    logId,
    userId,
    exerciseLogId,
  );
  res.json(exerciseLog);
}

async function createExerciseLog(req: Request, res: Response) {
  const userId = req.user!.id;
  const logId = res.locals.logId as number;
  const { exerciseId, notes } = req.body;

  if (
    exerciseId === undefined ||
    typeof exerciseId !== "string" ||
    exerciseId.length < 1
  ) {
    return res
      .status(400)
      .json({ error: "exerciseId is required and cannot be empty." });
  }

  const data: CreateExerciseLogInput = {
    workoutLogId: logId,
    exerciseId,
  };

  if (notes !== undefined) {
    if (typeof notes !== "string") {
      return res.status(400).json({ error: "Notes must be a string." });
    }
    data.notes = notes;
  }

  const newExerciseLog = await exerciseLogService.createExerciseLog(
    logId,
    userId,
    data,
  );
  res.status(201).json(newExerciseLog);
}

async function updateExerciseLog(req: Request, res: Response) {
  const userId = req.user!.id;
  const logId = res.locals.logId as number;
  const exerciseLogId = res.locals.exerciseLogId as number;
  const { notes } = req.body;

  const data: UpdateExerciseLogInput = {};

  if (notes !== undefined) {
    if (notes !== null && typeof notes !== "string") {
      return res
        .status(400)
        .json({ error: "Notes must be a string or null." });
    }
    data.notes = notes;
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
  const userId = req.user!.id;
  const logId = res.locals.logId as number;
  const exerciseLogId = res.locals.exerciseLogId as number;

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
