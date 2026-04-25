import type { Request, Response } from "express";
import * as workoutLogService from "../services/workoutLog.service.js";
import type {
  CreateWorkoutLogInput,
  UpdateWorkoutLogInput,
} from "../types/workoutLog.dto.js";

async function getAllWorkoutLogs(req: Request, res: Response) {
  const userId = req.user!.id;
  const { page, limit } = req.pagination!;

  const logs = await workoutLogService.getAllWorkoutLogs(userId, page, limit);
  res.json(logs);
}

async function getWorkoutLogById(req: Request, res: Response) {
  const userId = req.user!.id;
  const logId = res.locals.logId as number;

  const log = await workoutLogService.getWorkoutLogById(userId, logId);
  res.json(log);
}

async function createWorkoutLog(req: Request, res: Response) {
  const userId = req.user!.id;
  const isoDate = res.locals.date;
  const { workoutDayId } = req.body;

  const data: CreateWorkoutLogInput = { userId, date: isoDate };

  if (workoutDayId !== undefined) {
    if (
      typeof workoutDayId !== "number" ||
      workoutDayId < 1 ||
      !Number.isInteger(workoutDayId)
    ) {
      return res
        .status(400)
        .json({ error: "workoutDayId must be a positive integer." });
    }
    data.workoutDayId = workoutDayId;
  }

  const newLog = await workoutLogService.createWorkoutLog(userId, data);
  res.status(201).json(newLog);
}

async function updateWorkoutLog(req: Request, res: Response) {
  const userId = req.user!.id;
  const logId = res.locals.logId as number;
  const isoDate = res.locals.date;
  const { workoutDayId } = req.body;

  const data: UpdateWorkoutLogInput = {};

  if (isoDate !== undefined) {
    data.date = isoDate;
  }

  if (workoutDayId !== undefined) {
    if (workoutDayId === null) {
      data.workoutDayId = null;
    } else if (
      typeof workoutDayId !== "number" ||
      workoutDayId < 1 ||
      !Number.isInteger(workoutDayId)
    ) {
      return res
        .status(400)
        .json({ error: "workoutDayId must be a positive integer or null." });
    } else {
      data.workoutDayId = workoutDayId;
    }
  }

  if (Object.keys(data).length === 0) {
    return res
      .status(400)
      .json({ error: "No valid fields were provided to update." });
  }

  const updatedLog = await workoutLogService.updateWorkoutLog(
    userId,
    logId,
    data,
  );
  res.json(updatedLog);
}

async function deleteWorkoutLog(req: Request, res: Response) {
  const userId = req.user!.id;
  const logId = res.locals.logId as number;

  await workoutLogService.deleteWorkoutLog(userId, logId);
  return res.status(204).send();
}

export {
  getAllWorkoutLogs,
  getWorkoutLogById,
  createWorkoutLog,
  updateWorkoutLog,
  deleteWorkoutLog,
};
