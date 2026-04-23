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

async function createWeight(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;
  const { amount, date } = req.body;

  // Check if amount, and date are present
  if (amount === undefined || date === undefined) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  // Validate amount and date
  if (typeof amount !== "number" || typeof date !== "string") {
    return res
      .status(400)
      .json({ error: "Amount must be a number and date must be a string" });
  }

  // Validate weight amount (must be a positive number)
  if (amount < 0) {
    return res.status(400).json({ error: "Amount must be a positive number" });
  }

  // Validate date format (ISO 8601)
  if (isNaN(Date.parse(date))) {
    return res.status(400).json({ error: "Date must be in ISO 8601 format" });
  }
  const isoDate = new Date(date).toISOString();

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
  const { amount, date } = req.body;

  // Ensure that at least one of amount or date is provided
  if (amount === undefined && date === undefined) {
    return res
      .status(400)
      .json({ error: "At least one of amount or date must be provided" });
  }

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

  if (date !== undefined) {
    if (typeof date !== "string") {
      return res.status(400).json({ error: "Date must be a string" });
    }

    // Validate date format (ISO 8601)
    if (date && isNaN(Date.parse(date))) {
      return res.status(400).json({ error: "Date must be in ISO 8601 format" });
    }

    const isoDate = new Date(date).toISOString();
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

export { getAllWeights, createWeight, updateWeight, deleteWeight };
