import type { Request, Response } from "express";
import * as exerciseService from "../services/exercise.service.js";
import type {
  CreateExerciseInput,
  UpdateExerciseInput,
} from "../types/exercise.dto.js";
import { LIMITS } from "../helpers/limits.js";
import {
  validateBoundedString,
  validateEnum,
  validateStringArray,
} from "../helpers/validators.js";
import {
  EXERCISE_FORCE,
  EXERCISE_LEVEL,
  EXERCISE_MECHANIC,
} from "../helpers/exerciseVocab.js";

// Validates the optional, shared exercise attributes (everything except the
// required id/slug/name). Returns only the fields that were provided, each run
// through the appropriate validator. Reused by create and update so the rules
// live in exactly one place.
function validateExerciseAttributes(
  body: Record<string, unknown>,
): Omit<UpdateExerciseInput, "name"> {
  const {
    force,
    level,
    mechanic,
    equipment,
    category,
    primaryMuscles,
    secondaryMuscles,
    instructions,
    images,
  } = body;

  const data: Omit<UpdateExerciseInput, "name"> = {};

  // force / level / mechanic are small closed vocabularies — strict enum check.
  // Lowercase string input first so "Push" matches the lowercase seed values;
  // a non-string falls through unchanged and validateEnum rejects it.
  if (force !== undefined) {
    const v = typeof force === "string" ? force.toLowerCase() : force;
    data.force = validateEnum("force", v, EXERCISE_FORCE);
  }
  if (level !== undefined) {
    const v = typeof level === "string" ? level.toLowerCase() : level;
    data.level = validateEnum("level", v, EXERCISE_LEVEL);
  }
  if (mechanic !== undefined) {
    const v = typeof mechanic === "string" ? mechanic.toLowerCase() : mechanic;
    data.mechanic = validateEnum("mechanic", v, EXERCISE_MECHANIC);
  }

  // equipment / category are open-ended — length-bound only.
  if (equipment !== undefined) {
    data.equipment = validateBoundedString(
      "equipment",
      equipment,
      LIMITS.EQUIPMENT_MAX,
    );
  }
  if (category !== undefined) {
    data.category = validateBoundedString(
      "category",
      category,
      LIMITS.CATEGORY_MAX,
    );
  }

  // String arrays — cap item count and each element's length.
  if (primaryMuscles !== undefined) {
    data.primaryMuscles = validateStringArray(
      "primaryMuscles",
      primaryMuscles,
      LIMITS.MUSCLES_MAX_ITEMS,
      LIMITS.MUSCLE_MAX,
    );
  }
  if (secondaryMuscles !== undefined) {
    data.secondaryMuscles = validateStringArray(
      "secondaryMuscles",
      secondaryMuscles,
      LIMITS.MUSCLES_MAX_ITEMS,
      LIMITS.MUSCLE_MAX,
    );
  }
  if (instructions !== undefined) {
    data.instructions = validateStringArray(
      "instructions",
      instructions,
      LIMITS.INSTRUCTIONS_MAX_ITEMS,
      LIMITS.INSTRUCTION_MAX,
    );
  }
  if (images !== undefined) {
    data.images = validateStringArray(
      "images",
      images,
      LIMITS.IMAGES_MAX_ITEMS,
      LIMITS.IMAGE_PATH_MAX,
    );
  }

  return data;
}

async function getExercises(req: Request, res: Response) {
  // Get pagination parameters from query string
  const { page, limit } = req.pagination!;

  // Optional case-insensitive search by exercise name. Narrows results before
  // pagination so `total` reflects the filtered set, not the whole table.
  // `q` is optional, so only validate when present and treat empty as "no filter".
  const rawQ = req.query.q;
  let q: string | undefined;
  if (rawQ !== undefined) {
    const trimmed = validateBoundedString("exerciseQuery", rawQ, LIMITS.SEARCH_Q_MAX, {
      allowEmpty: true,
    });
    q = trimmed.length > 0 ? trimmed : undefined;
  }

  const { exercises, total } = await exerciseService.getExercises(
    page,
    limit,
    q,
  );

  res.json({ exercises, total, page, limit });
}

async function getExerciseById(req: Request, res: Response) {
  const slug = validateBoundedString(
    "exerciseSlug",
    req.params.slug,
    LIMITS.ID_MAX,
  );

  const exercise = await exerciseService.getExerciseById(slug);
  res.json(exercise);
}

async function createExercise(req: Request, res: Response) {
  const body = req.body ?? {};

  // Required string fields
  const id = validateBoundedString("exerciseId", body.id, LIMITS.ID_MAX);
  const slug = validateBoundedString(
    "exerciseSlug",
    body.slug,
    LIMITS.ID_MAX,
  ).toLowerCase();
  const name = validateBoundedString("name", body.name, LIMITS.NAME_MAX);

  const exerciseData: CreateExerciseInput = {
    id,
    slug,
    name,
    ...validateExerciseAttributes(body),
  };

  const exercise = await exerciseService.createExercise(exerciseData);
  res.status(201).json(exercise);
}

async function updateExercise(req: Request, res: Response) {
  const slug = validateBoundedString(
    "exerciseSlug",
    req.params.slug,
    LIMITS.ID_MAX,
  );

  const body = req.body ?? {};

  const exerciseData: UpdateExerciseInput = validateExerciseAttributes(body);

  if (body.name !== undefined) {
    exerciseData.name = validateBoundedString(
      "name",
      body.name,
      LIMITS.NAME_MAX,
    );
  }

  if (Object.keys(exerciseData).length === 0) {
    return res
      .status(400)
      .json({ error: "At least one field must be provided for update" });
  }

  const updatedExercise = await exerciseService.updateExercise(
    slug,
    exerciseData,
  );
  return res.json(updatedExercise);
}

async function deleteExercise(req: Request, res: Response) {
  const slug = req.params.slug;

  if (!slug || typeof slug !== "string") {
    return res.status(400).json({ error: "Exercise ID is required" });
  }
  await exerciseService.deleteExercise(slug);
  res.status(204).send(); // No content
}

export {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
};
