import type { Request, Response } from "express";
import * as weightService from "../services/weight.service.js";
import { NotFoundError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";

async function getAllWeights(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const page = req.query.page;
    const limit = req.query.limit;

    // Check if user, page, and limit are present
    if (!userId || typeof page !== "string" || typeof limit !== "string") {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Convert page and limit to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Validate page and limit
    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      return res
        .status(400)
        .json({ error: "Page and limit must be positive integers" });
    }

    // Get all the weights for the user that made the request
    const weights = await weightService.getAllWeights(
      userId,
      pageNum,
      limitNum,
    );

    // This could be an empty list of weights
    res.json(weights);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error fetching weights" });
    }
  }
}

async function createWeight(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { amount, date } = req.body;

    // Check if user, amount, and date are present
    if (!userId || amount === undefined || date === undefined) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate amount and date
    if (typeof amount !== "number" || typeof date !== "string") {
      return res
        .status(400)
        .json({ error: "Amount must be a number and date must be a string" });
    }

    // Validate date format (ISO 8601)
    if (isNaN(Date.parse(date))) {
      return res.status(400).json({ error: "Date must be in ISO 8601 format" });
    }
    const isoDate = new Date(date).toISOString();

    const weightData: Prisma.WeightUncheckedCreateInput = {
      userId,
      amount,
      date: isoDate,
    };

    const newWeight = await weightService.createWeight(weightData);
    res.status(201).json(newWeight);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      // This case should never happen, but we want to handle it just in case
      res.status(500).json({ error: "Unknown error was thrown." });
    }
  }
}

async function updateWeight(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const weightId = req.params.id;
    const { amount, date } = req.body;

    // Check if userId and weightId are present
    if (!userId || !weightId || typeof weightId !== "string") {
      return res.status(400).json({ error: "Weight ID is required." });
    }

    // Ensure that at least one of amount or date is provided
    if (amount === undefined && date === undefined) {
      return res
        .status(400)
        .json({ error: "At least one of amount or date must be provided" });
    }

    // Validate weightId
    const weightIdNum = parseInt(weightId, 10);
    if (isNaN(weightIdNum)) {
      return res.status(400).json({ error: "Weight ID must be a number" });
    }

    // Validate weightAmount and date if they are present and add them to the data object
    const weightData: Prisma.WeightUpdateInput = {};
    if (amount !== undefined) {
      if (typeof amount !== "number") {
        return res.status(400).json({ error: "Amount must be a number" });
      }
      weightData.amount = amount;
    }

    if (date !== undefined) {
      if (typeof date !== "string") {
        return res.status(400).json({ error: "Date must be a string" });
      }

      // Validate date format (ISO 8601)
      if (date && isNaN(Date.parse(date))) {
        return res
          .status(400)
          .json({ error: "Date must be in ISO 8601 format" });
      }

      const isoDate = new Date(date).toISOString();
      weightData.date = isoDate;
    }

    const newWeight = await weightService.updateWeight(
      userId,
      weightIdNum,
      weightData,
    );
    res.status(200).json(newWeight);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error fetching weights" });
    }
  }
}

async function deleteWeight(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const weightId = req.params.id;

    // Check if userId and weightId are present
    if (!userId || !weightId || typeof weightId !== "string") {
      return res.status(400).json({ error: "Weight ID is required." });
    }

    // Validate weightId
    const weightIdNum = parseInt(weightId, 10);
    if (isNaN(weightIdNum)) {
      return res.status(400).json({ error: "Weight ID must be a number" });
    }

    await weightService.deleteWeight(userId, weightIdNum);
    return res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error fetching weights" });
    }
  }
}

export { getAllWeights, createWeight, updateWeight, deleteWeight };
