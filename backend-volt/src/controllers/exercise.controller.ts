import type { Request, Response } from "express";
import * as exerciseService from "../services/exercise.service.js";
import { Prisma } from "../generated/prisma/client.js";
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

async function createExercise(req: Request, res: Response) {
  try {
    // TODO(human): Parse req.body and validate it here.
    // - id and name are required strings; return 400 if missing or wrong type
    // - force, level, mechanic, equipment, category are optional strings
    // - primaryMuscles, secondaryMuscles, instructions, images are optional string arrays
    // - return 400 with a helpful error message if anything is invalid
    // Build an `exerciseData` object from the valid fields and pass it below.
    const exerciseData: Prisma.ExerciseCreateInput = {
      id: req.body.id,
      name: req.body.name,
      force: req.body.force,
      level: req.body.level,
      mechanic: req.body.mechanic,
      equipment: req.body.equipment,
      category: req.body.category,
      primaryMuscles: req.body.primaryMuscles,
      secondaryMuscles: req.body.secondaryMuscles,
      instructions: req.body.instructions,
      images: req.body.images,
    };

    if (!exerciseData.id || typeof exerciseData.id !== "string") {
      return res
        .status(400)
        .json({ error: "Exercise ID is required and must be a string" });
    }
    if (!exerciseData.name || typeof exerciseData.name !== "string") {
      return res
        .status(400)
        .json({ error: "Exercise name is required and must be a string" });
    }

    const exercise = await exerciseService.createExercise(exerciseData);
    res.status(201).json(exercise);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error creating exercise" });
    }
  }
}

async function updateExercise(req: Request, res: Response) {}

async function deleteExercise(req: Request, res: Response) {
  try {
    const exerciseId = req.params.id;

    if (!exerciseId || typeof exerciseId !== "string") {
      return res.status(400).json({ error: "Exercise ID is required" });
    }
    await exerciseService.deleteExercise(exerciseId);
    res.status(204).send(); // No content
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error deleting exercise" });
    }
  }
}

export {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
};
