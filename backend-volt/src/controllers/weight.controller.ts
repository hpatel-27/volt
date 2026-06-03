import type { Request, Response } from "express";
import * as weightService from "../services/weight.service.js";
import type {
  CreateWeightInput,
  UpdateWeightInput,
} from "../types/weight.dto.js";
import { validatePositiveNumber } from "../helpers/validators.js";

async function getAllWeights(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;

  const { page, limit } = req.pagination!;
  const weights = await weightService.getAllWeights(userId, page, limit);
  res.json(weights);
}

// Range mode: both from and to provided -> return all weights in that window, no pagination.
// Used by the chart to plot every entry in the active filter range (7D / 30D / 90D / All).
async function getWeightsByRange(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const locals = res.locals!;

  // Add a limit on the date range to prevent abuse (14 days)
  const fromDate = locals.fromDate!;
  const toDate = locals.toDate!;

  const weights = await weightService.getWeightsByRange(
    userId,
    fromDate,
    toDate,
  );
  return res.json(weights);
}

async function getWeightById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const weightId = res.locals.weightId as string;

  const weight = await weightService.getWeightById(userId, weightId);
  res.json(weight);
}

async function createWeight(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { amount } = req.body;
  // The date middleware guarantees the date is valid if it exists
  const isoDate = res.locals.date;

  validatePositiveNumber("amount", amount);

  const weightData: CreateWeightInput = {
    userId,
    amount,
    date: isoDate,
  };

  const newWeight = await weightService.createWeight(weightData);
  res.status(201).json(newWeight);
}

async function updateWeight(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const weightId = res.locals.weightId as string;
  const { amount } = req.body;

  // The date middleware guarantees the date is valid if it exists
  const isoDate = res.locals.date;

  // Validate weightAmount and date if they are present and add them to the data object
  const weightData: UpdateWeightInput = {};
  if (amount !== undefined) {
    validatePositiveNumber("amount", amount);
    weightData.amount = amount;
  }

  if (isoDate !== undefined) {
    weightData.date = isoDate;
  }

  if (Object.keys(weightData).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  const newWeight = await weightService.updateWeight(
    userId,
    weightId,
    weightData,
  );
  res.status(200).json(newWeight);
}

async function deleteWeight(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const weightId = res.locals.weightId as string;

  await weightService.deleteWeight(userId, weightId);
  return res.status(204).send();
}

export {
  getAllWeights,
  getWeightsByRange,
  getWeightById,
  createWeight,
  updateWeight,
  deleteWeight,
};
