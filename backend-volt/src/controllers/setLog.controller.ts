import type { Request, Response } from "express";
import * as setLogService from "../services/setLog.service.js";
import type {
  CreateSetLogInput,
  UpdateSetLogInput,
} from "../types/setLog.dto.js";
import {
  validatePositiveInt,
  validateNonNegativeNumber,
} from "../helpers/validators.js";
import { LIMITS } from "../helpers/limits.js";

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
  const { reps, weight } = req.body ?? {};

  validatePositiveInt("reps", reps, LIMITS.REPS_MAX);
  validateNonNegativeNumber("weight", weight, LIMITS.LIFT_WEIGHT_MAX);

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
  const { reps, weight } = req.body ?? {};

  const data: UpdateSetLogInput = {};

  if (reps !== undefined) {
    validatePositiveInt("reps", reps, LIMITS.REPS_MAX);
    data.reps = reps;
  }

  if (weight !== undefined) {
    validateNonNegativeNumber("weight", weight, LIMITS.LIFT_WEIGHT_MAX);
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
