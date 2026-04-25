import type { Request, Response } from "express";
import * as setLogService from "../services/setLog.service.js";
import type {
  CreateSetLogInput,
  UpdateSetLogInput,
} from "../types/setLog.dto.js";

async function getAllSetLogs(req: Request, res: Response) {
  const userId = req.user!.id;
  const logId = res.locals.logId as number;
  const exerciseLogId = res.locals.exerciseLogId as number;

  const sets = await setLogService.getAllSetLogs(logId, exerciseLogId, userId);
  res.json(sets);
}

async function createSetLog(req: Request, res: Response) {
  const userId = req.user!.id;
  const logId = res.locals.logId as number;
  const exerciseLogId = res.locals.exerciseLogId as number;
  const { setNumber, reps, weight } = req.body;

  if (
    setNumber === undefined ||
    typeof setNumber !== "number" ||
    setNumber < 1 ||
    !Number.isInteger(setNumber)
  ) {
    return res
      .status(400)
      .json({ error: "setNumber is required and must be a positive integer." });
  }

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
    setNumber,
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
  const userId = req.user!.id;
  const logId = res.locals.logId as number;
  const exerciseLogId = res.locals.exerciseLogId as number;
  const setId = res.locals.setId as number;
  const { setNumber, reps, weight } = req.body;

  const data: UpdateSetLogInput = {};

  if (setNumber !== undefined) {
    if (
      typeof setNumber !== "number" ||
      setNumber < 1 ||
      !Number.isInteger(setNumber)
    ) {
      return res
        .status(400)
        .json({ error: "setNumber must be a positive integer." });
    }
    data.setNumber = setNumber;
  }

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

  const updated = await setLogService.updateSetLog(
    logId,
    exerciseLogId,
    userId,
    setId,
    data,
  );
  res.json(updated);
}

async function deleteSetLog(req: Request, res: Response) {
  const userId = req.user!.id;
  const logId = res.locals.logId as number;
  const exerciseLogId = res.locals.exerciseLogId as number;
  const setId = res.locals.setId as number;

  await setLogService.deleteSetLog(logId, exerciseLogId, userId, setId);
  return res.status(204).send();
}

export { getAllSetLogs, createSetLog, updateSetLog, deleteSetLog };
