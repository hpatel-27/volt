import type { Request, Response } from "express";
import * as weightService from "../services/weight.service.js";
import type {
  CreateWeightInput,
  UpdateWeightInput,
} from "../types/weight.dto.js";

async function getAllWeights(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { page, limit } = req.pagination!;

  // Get all the weights for the user that made the request
  const weights = await weightService.getAllWeights(userId, page, limit);

  // This could be an empty list of weights
  res.json(weights);
}

async function getWeightById(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const weightId = res.locals.weightId as number;

  const weight = await weightService.getWeightById(userId, weightId);
  res.json(weight);
}

async function createWeight(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { amount } = req.body;
  // The date middleware guarantees the date is valid if it exists
  const isoDate = res.locals.date;

  // Check if amount is present
  if (amount === undefined) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  // Validate amount
  if (typeof amount !== "number") {
    return res.status(400).json({ error: "Amount must be a number" });
  }

  // Validate weight amount (must be a positive number)
  if (amount < 0) {
    return res.status(400).json({ error: "Amount must be a positive number" });
  }

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
  const weightId = res.locals.weightId as number;
  const { amount } = req.body;

  // The date middleware guarantees the date is valid if it exists
  const isoDate = res.locals.date;

  // Validate weightAmount and date if they are present and add them to the data object
  const weightData: UpdateWeightInput = {};
  if (amount !== undefined) {
    if (typeof amount !== "number" || amount < 0) {
      return res
        .status(400)
        .json({ error: "Amount must be a positive number" });
    }
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
  const weightId = res.locals.weightId as number;

  await weightService.deleteWeight(userId, weightId);
  return res.status(204).send();
}

export {
  getAllWeights,
  getWeightById,
  createWeight,
  updateWeight,
  deleteWeight,
};
