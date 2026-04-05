import type { Request, Response } from "express";
import * as nutritionService from "../services/nutrition.service.js";
import { DuplicateEntryError, NotFoundError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";

// Return all nutrition logs for the user that made the request
// Use pagination to limit the number of logs returned at once
async function getAllNutritionLogs(req: Request, res: Response) {
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

    const nutritionLogs = await nutritionService.getAllNutritionLogs(
      userId,
      pageNum,
      limitNum,
    );
    res.json(nutritionLogs);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error fetching nutrition logs" });
    }
  }
}

// Return a single nutrition log by its ID, this includes full meal details
async function getNutritionLogById(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const logId = req.params.id;

    // Check if user and logId are present
    if (!userId || !logId || typeof logId !== "string") {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate logId is a number
    const parsedLogId = parseInt(logId, 10);
    if (isNaN(parsedLogId)) {
      return res.status(400).json({ error: "Invalid log ID" });
    }

    // Get the nutrition log for the user that made the request and return it
    const nutritionLog = await nutritionService.getNutritionLogById(
      userId,
      parsedLogId,
    );

    res.json(nutritionLog);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error fetching nutrition log" });
    }
  }
}

async function createNutritionLog(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { date } = req.body;

    // Check if user and date are present
    if (!userId || !date) {
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
  } catch (error: unknown) {
    if (error instanceof DuplicateEntryError) {
      res.status(409).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error creating nutrition log" });
    }
  }
}

async function updateNutritionLog(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const logId = req.params.id;
    const { date } = req.body;

    // Check if user, logId, and date are present
    if (
      !userId ||
      !logId ||
      !date ||
      typeof logId !== "string" ||
      typeof date !== "string"
    ) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate logId is a number
    const parsedLogId = parseInt(logId, 10);
    if (isNaN(parsedLogId)) {
      return res.status(400).json({ error: "Invalid log ID" });
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
      parsedLogId,
      userId,
      logData,
    );
    return res.json(updatedLog);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error updating nutrition log" });
    }
  }
}

async function deleteNutritionLog(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const logId = req.params.id;

    // Check if user and logId are present
    if (!userId || !logId || typeof logId !== "string") {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Validate logId is a number
    const parsedLogId = parseInt(logId, 10);
    if (isNaN(parsedLogId)) {
      return res.status(400).json({ error: "Invalid log ID" });
    }

    // Delete the nutrition log for the user that made the request
    await nutritionService.deleteNutritionLog(userId, parsedLogId);
    res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error deleting nutrition log" });
    }
  }
}

export {
  getAllNutritionLogs,
  getNutritionLogById,
  createNutritionLog,
  updateNutritionLog,
  deleteNutritionLog,
};
