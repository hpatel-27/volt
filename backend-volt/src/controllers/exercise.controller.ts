import type { Request, Response } from "express";
import * as exerciseService from "../services/exercise.service.js";
import { NotFoundError } from "../errors.js";

async function getExercises(req: Request, res: Response) {
  try {
    // Get pagination parameters from query string, with defaults.
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const { exercises, total } = await exerciseService.getExercises(
      page,
      limit,
    );

    res.json({ exercises, total, page, limit });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error fetching exercises" });
    }
  }
}

async function getExerciseById(req: Request, res: Response) {
  try {
    const exerciseId = req.params.id;
    if (!exerciseId || typeof exerciseId !== "string") {
      return res.status(400).json({ error: "Exercise ID is required" });
    }

    const exercise = await exerciseService.getExerciseById(exerciseId);
    res.json(exercise);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error fetching exercise" });
    }
  }
}

export { getExercises, getExerciseById };
