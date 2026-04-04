import type { Request, Response } from "express";
import * as exerciseService from "../services/exercise.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { DuplicateEntryError, NotFoundError } from "../errors.js";

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
    // Validate required String fields
    if (!req.body.id || typeof req.body.id !== "string") {
      return res
        .status(400)
        .json({ error: "Exercise ID is required and must be a string" });
    }
    if (!req.body.name || typeof req.body.name !== "string") {
      return res
        .status(400)
        .json({ error: "Exercise name is required and must be a string" });
    }

    // Validate optional String fields
    if (req.body.force && typeof req.body.force !== "string") {
      return res
        .status(400)
        .json({ error: "Attribute force must be a string if provided" });
    }

    if (req.body.level && typeof req.body.level !== "string") {
      return res
        .status(400)
        .json({ error: "Attribute level must be a string if provided" });
    }

    if (req.body.mechanic && typeof req.body.mechanic !== "string") {
      return res
        .status(400)
        .json({ error: "Attribute mechanic must be a string if provided" });
    }

    if (req.body.equipment && typeof req.body.equipment !== "string") {
      return res
        .status(400)
        .json({ error: "Attribute equipment must be a string if provided" });
    }

    if (req.body.category && typeof req.body.category !== "string") {
      return res
        .status(400)
        .json({ error: "Attribute category must be a string if provided" });
    }

    // Validate optional String[] data
    if (
      req.body.primaryMuscles &&
      (!Array.isArray(req.body.primaryMuscles) ||
        !req.body.primaryMuscles.every((m: any) => typeof m === "string"))
    ) {
      return res.status(400).json({
        error: "Attribute primaryMuscles must be an array of strings",
      });
    }

    if (
      req.body.secondaryMuscles &&
      (!Array.isArray(req.body.secondaryMuscles) ||
        !req.body.secondaryMuscles.every((m: any) => typeof m === "string"))
    ) {
      return res.status(400).json({
        error: "Attribute secondaryMuscles must be an array of strings",
      });
    }

    if (
      req.body.instructions &&
      (!Array.isArray(req.body.instructions) ||
        !req.body.instructions.every((i: any) => typeof i === "string"))
    ) {
      return res
        .status(400)
        .json({ error: "Attribute instructions must be an array of strings" });
    }

    if (
      req.body.images &&
      (!Array.isArray(req.body.images) ||
        !req.body.images.every((i: any) => typeof i === "string"))
    ) {
      return res
        .status(400)
        .json({ error: "Attribute images must be an array of strings" });
    }

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

    const exercise = await exerciseService.createExercise(exerciseData);
    res.status(201).json(exercise);
  } catch (error) {
    if (error instanceof DuplicateEntryError) {
      res.status(409).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error creating exercise" });
    }
  }
}

async function updateExercise(req: Request, res: Response) {
  try {
    // Validate exercise ID
    const exerciseId = req.params.id;
    if (!exerciseId || typeof exerciseId !== "string") {
      return res.status(400).json({ error: "Exercise ID is required" });
    }

    const exerciseData: Prisma.ExerciseUpdateInput = {};

    // Validate potential String fields to update
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string") {
        return res
          .status(400)
          .json({ error: "Exercise name must be a string if provided" });
      }
      exerciseData.name = req.body.name;
    }

    if (req.body.force !== undefined) {
      if (typeof req.body.force !== "string") {
        return res
          .status(400)
          .json({ error: "Attribute force must be a string if provided" });
      }
      exerciseData.force = req.body.force;
    }

    if (req.body.level !== undefined) {
      if (typeof req.body.level !== "string") {
        return res
          .status(400)
          .json({ error: "Attribute level must be a string if provided" });
      }
      exerciseData.level = req.body.level;
    }

    if (req.body.mechanic !== undefined) {
      if (typeof req.body.mechanic !== "string") {
        return res
          .status(400)
          .json({ error: "Attribute mechanic must be a string if provided" });
      }
      exerciseData.mechanic = req.body.mechanic;
    }

    if (req.body.equipment !== undefined) {
      if (typeof req.body.equipment !== "string") {
        return res
          .status(400)
          .json({ error: "Attribute equipment must be a string if provided" });
      }
      exerciseData.equipment = req.body.equipment;
    }

    if (req.body.category !== undefined) {
      if (typeof req.body.category !== "string") {
        return res
          .status(400)
          .json({ error: "Attribute category must be a string if provided" });
      }
      exerciseData.category = req.body.category;
    }

    // Validate optional String[] data
    if (req.body.primaryMuscles !== undefined) {
      if (
        !Array.isArray(req.body.primaryMuscles) ||
        !req.body.primaryMuscles.every((m: any) => typeof m === "string")
      ) {
        return res.status(400).json({
          error: "Attribute primaryMuscles must be an array of strings",
        });
      }
      exerciseData.primaryMuscles = req.body.primaryMuscles;
    }

    if (req.body.secondaryMuscles !== undefined) {
      if (
        !Array.isArray(req.body.secondaryMuscles) ||
        !req.body.secondaryMuscles.every((m: any) => typeof m === "string")
      ) {
        return res.status(400).json({
          error: "Attribute secondaryMuscles must be an array of strings",
        });
      }
      exerciseData.secondaryMuscles = req.body.secondaryMuscles;
    }

    if (req.body.instructions !== undefined) {
      if (
        !Array.isArray(req.body.instructions) ||
        !req.body.instructions.every((i: any) => typeof i === "string")
      ) {
        return res.status(400).json({
          error: "Attribute instructions must be an array of strings",
        });
      }
      exerciseData.instructions = req.body.instructions;
    }

    if (req.body.images !== undefined) {
      if (
        !Array.isArray(req.body.images) ||
        !req.body.images.every((i: any) => typeof i === "string")
      ) {
        return res.status(400).json({
          error: "Attribute images must be an array of strings",
        });
      }
      exerciseData.images = req.body.images;
    }

    if (Object.keys(exerciseData).length === 0) {
      return res
        .status(400)
        .json({ error: "At least one field must be provided for update" });
    }

    const updatedExercise = await exerciseService.updateExercise(
      exerciseId,
      exerciseData,
    );
    return res.json(updatedExercise);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error updating exercise" });
    }
  }
}

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
