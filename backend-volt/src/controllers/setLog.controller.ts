import type { Request, Response } from "express";
import * as setLogService from "../services/setLog.service.js";
import type {
  CreateSetLogInput,
  UpdateSetLogInput,
} from "../types/setLog.dto.js";

async function getAllSetLogs(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as string;
  const exerciseLogId = res.locals.exerciseLogId as string;

  const sets = await setLogService.getAllSetLogs(logId, exerciseLogId, userId);
  res.json(sets);
}

async function getSetById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const setId = res.locals.setId as string;

  const set = await setLogService.getSetById(userId, setId);
  res.json(set);
}

async function createSetLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as string;
  const exerciseLogId = res.locals.exerciseLogId as string;
  const { reps, weight } = req.body;

  if (
    reps === undefined ||
    typeof reps !== "number" ||
    reps < 1 ||
    !Number.isInteger(reps)
  ) {
    return res
      .status(400)
      .json({ error: "Reps is required and must be a positive integer." });
  }

  if (weight === undefined || typeof weight !== "number" || weight < 0) {
    return res
      .status(400)
      .json({ error: "Weight is required and must be a non-negative number." });
  }

  const data: CreateSetLogInput = {
    exerciseLogId,
    reps,
    weight,
  };

  const newSet = await setLogService.createSetLog(
    logId,
    exerciseLogId,
    userId,
    data,
  );
  res.status(201).json(newSet);
}

async function updateSetLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const setId = res.locals.setId as string;
  const { reps, weight } = req.body;

  const data: UpdateSetLogInput = {};

  if (reps !== undefined) {
    if (typeof reps !== "number" || reps < 1 || !Number.isInteger(reps)) {
      return res
        .status(400)
        .json({ error: "Reps must be a positive integer." });
    }
    data.reps = reps;
  }

  if (weight !== undefined) {
    if (typeof weight !== "number" || weight < 0) {
      return res
        .status(400)
        .json({ error: "Weight must be a non-negative number." });
    }
    data.weight = weight;
  }

  if (Object.keys(data).length === 0) {
    return res
      .status(400)
      .json({ error: "No valid fields were provided to update." });
  }

  const updated = await setLogService.updateSetLog(userId, setId, data);
  res.json(updated);
}

async function deleteSetLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const setId = res.locals.setId as string;

  await setLogService.deleteSetLog(userId, setId);
  return res.status(204).send();
}

export { getAllSetLogs, getSetById, createSetLog, updateSetLog, deleteSetLog };
