import type { Request, Response } from "express";
import * as nutritionService from "../services/nutrition.service.js";
import type { Prisma } from "../generated/prisma/client.js";

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

// Return a single nutrition log by its ID, this includes full meal details
async function getNutritionLogById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as number;

  const nutritionLog = await nutritionService.getNutritionLogById(
    userId,
    logId,
  );

  res.json(nutritionLog);
}

async function createNutritionLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { date } = req.body;

  // Check if date is present
  if (!date) {
    return res.status(400).json({ error: "Missing required parameters" });
  }
  // Validate date is a string
  if (typeof date !== "string") {
    return res.status(400).json({ error: "Date must be a string" });
  }
  // Validate date format (ISO 8601)
  if (isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "Date must be in ISO 8601 format" });
  }
  const isoDate = new Date(date).toISOString();

  const logData: Prisma.NutritionLogUncheckedCreateInput = {
    userId,
    date: isoDate,
  };

  // Create a new nutrition log for the user that made the request and return it
  const newNutritionLog = await nutritionService.createNutritionLog(logData);
  res.status(201).json(newNutritionLog);
}

async function updateNutritionLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as number;
  const { date } = req.body;

  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  // Validate date format (ISO 8601)
  if (isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "Date must be in ISO 8601 format" });
  }
  const isoDate = new Date(date).toISOString();
  const logData: Prisma.NutritionLogUncheckedUpdateInput = {
    date: isoDate,
  };

  // Update the nutrition log for the user that made the request and return it
  const updatedLog = await nutritionService.updateNutritionLog(
    logId,
    userId,
    logData,
  );
  return res.json(updatedLog);
}

async function deleteNutritionLog(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const logId = res.locals.logId as number;

  // Delete the nutrition log for the user that made the request
  await nutritionService.deleteNutritionLog(logId, userId);
  res.status(204).send();
}

export {
  getAllNutritionLogs,
  getNutritionLogById,
  createNutritionLog,
  updateNutritionLog,
  deleteNutritionLog,
};
