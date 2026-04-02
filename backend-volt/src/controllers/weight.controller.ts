import type { Request, Response } from "express";
import * as weightService from "../services/weight.service.js";

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
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({ error: error.message });
      } else {
        // Internal server error
        res.status(500).json({ error: error.message });
      }
    } else {
      // This case should never happen, but we want to handle it just in case
      res.status(500).json({ error: "Unknown error was thrown." });
    }
  }
}

export { getAllWeights };
