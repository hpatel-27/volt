import type { Request, Response } from "express";
import * as workoutLogService from "../services/workoutLog.service.js";
import { BadRequestError } from "../errors.js";
import type {
  CreateWorkoutLogInput,
  UpdateWorkoutLogInput,
} from "../types/workoutLog.dto.js";

// YYYY-MM-DD format check — client sends its local "today" so we respect the
// user's timezone rather than deriving the date server-side.
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

async function getAllWorkoutLogs(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { page, limit } = req.pagination!;

  const logs = await workoutLogService.getAllWorkoutLogs(userId, page, limit);
  res.json(logs);
}

async function getWorkoutLogById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as string;

  const log = await workoutLogService.getWorkoutLogById(userId, logId);
  res.json(log);
}

// Return today's workout sessions as summaries (empty array if none yet). A day can
// hold multiple sessions, so this is a list. The client passes its local date via
// ?date=YYYY-MM-DD.
async function getTodayWorkoutLogs(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { date } = req.query;

  if (typeof date !== "string" || !DATE_REGEX.test(date)) {
    throw new BadRequestError("date query param must be in YYYY-MM-DD format");
  }

  const summaries = await workoutLogService.getTodayWorkoutLogs(userId, date);
  res.json(summaries);
}

async function createWorkoutLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const isoDate = res.locals.date;
  const { workoutDayId } = req.body;

  const data: CreateWorkoutLogInput = { userId, date: isoDate };

  if (workoutDayId !== undefined) {
    if (typeof workoutDayId !== "string" || workoutDayId.length < 1) {
      return res
        .status(400)
        .json({ error: "workoutDayId must be a UUID string." });
    }
    data.workoutDayId = workoutDayId;
  }

  const newLog = await workoutLogService.createWorkoutLog(userId, data);
  res.status(201).json(newLog);
}

async function updateWorkoutLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as string;
  const isoDate = res.locals.date;
  const { workoutDayId } = req.body;

  const data: UpdateWorkoutLogInput = {};

  if (isoDate !== undefined) {
    data.date = isoDate;
  }

  if (workoutDayId !== undefined) {
    if (workoutDayId === null) {
      data.workoutDayId = null;
    } else if (typeof workoutDayId !== "string" || workoutDayId.length < 1) {
      return res
        .status(400)
        .json({ error: "workoutDayId must be a UUID string or null." });
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
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as string;

  await workoutLogService.deleteWorkoutLog(userId, logId);
  return res.status(204).send();
}

export {
  getAllWorkoutLogs,
  getTodayWorkoutLogs,
  getWorkoutLogById,
  createWorkoutLog,
  updateWorkoutLog,
  deleteWorkoutLog,
};
