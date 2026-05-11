import type { Request, Response } from "express";
import * as weightService from "../services/weight.service.js";
import type {
  CreateWeightInput,
  UpdateWeightInput,
} from "../types/weight.dto.js";

async function getAllWeights(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;

  const { from, to } = req.query;

  // Range mode: both from and to provided -> return all weights in that window, no pagination.
  // Used by the chart to plot every entry in the active filter range (7D / 30D / 90D / All).
  if (from !== undefined || to !== undefined) {
    if (typeof from !== "string" || typeof to !== "string") {
      return res
        .status(400)
        .json({ error: "from and to must both be provided as strings" });
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res
        .status(400)
        .json({ error: "from and to must be valid ISO date strings" });
    }
    if (fromDate > toDate) {
      return res
        .status(400)
        .json({ error: "from must be on or before to" });
    }

    const weights = await weightService.getWeightsByRange(
      userId,
      fromDate,
      toDate,
    );
    return res.json(weights);
  }

  // Default mode: paginated list
  const { page, limit } = req.pagination!;
  const weights = await weightService.getAllWeights(userId, page, limit);
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
