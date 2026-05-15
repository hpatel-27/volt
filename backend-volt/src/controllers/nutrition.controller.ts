import type { Request, Response } from "express";
import * as nutritionService from "../services/nutrition.service.js";
import type { CreateNutritionLogInput } from "../types/nutrition.dto.js";
import { BadRequestError } from "../errors.js";

// Return all nutrition logs for the user that made the request
// Use pagination to limit the number of logs returned at once
async function getAllNutritionLogs(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { page, limit } = req.pagination!;

  const nutritionLogs = await nutritionService.getAllNutritionLogs(
    userId,
    page,
    limit,
  );
  res.json(nutritionLogs);
}

// Range mode: both from and to provided -> return all nutrition logs in that window, no pagination.
// Used by the day strip on the nutrition page.
async function getNutritionLogsByRange(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;

  const locals = res.locals;
  const fromDate = locals.fromDate!;
  const toDate = locals.toDate!;

  const logs = await nutritionService.getNutritionLogsByRange(
    userId,
    fromDate,
    toDate,
  );
  return res.json(logs);
}

// Return a single nutrition log by its date (YYYY-MM-DD), this includes full meal details
async function getNutritionLogByDate(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  // parseDateParam middleware guarantees this is a valid YYYY-MM-DD string
  const date = res.locals.date as string;

  const nutritionLog = await nutritionService.getNutritionLogByDate(
    userId,
    date,
  );

  res.json(nutritionLog);
}

async function createNutritionLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  // The date middleware guarantees the date is valid if it exists
  const isoDate = res.locals.date;

  const logData: CreateNutritionLogInput = {
    userId,
    date: isoDate,
  };

  // Create a new nutrition log for the user that made the request and return it
  const newNutritionLog = await nutritionService.createNutritionLog(logData);
  res.status(201).json(newNutritionLog);
}

// PATCH /nutrition/:date — date is the URL key so the date itself cannot be changed.
// To move a log to a different date, delete it and create a new one.
// This endpoint is intentionally kept for forward-extensibility (if non-date fields
// are added to NutritionLog in the future) but currently always returns 405.
async function updateNutritionLog(_req: Request, res: Response) {
  return res.status(405).json({
    error:
      "Nutrition log date cannot be changed. To move a log, delete it and create a new one.",
  });
}

async function deleteNutritionLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  // parseDateParam middleware guarantees this is a valid YYYY-MM-DD string
  const date = res.locals.date as string;

  // Delete the nutrition log for the user that made the request
  await nutritionService.deleteNutritionLogByDate(userId, date);
  res.status(204).send();
}

export {
  getAllNutritionLogs,
  getNutritionLogsByRange,
  getNutritionLogByDate,
  createNutritionLog,
  updateNutritionLog,
  deleteNutritionLog,
};
