import type { Request, Response } from "express";
import * as goalService from "../services/goal.service.js";
import type { CreateGoalInput, UpdateGoalInput } from "../types/goal.dto.js";
import {
  validateEnum,
  validateNonNegativeNumber,
  validatePositiveNumber,
} from "../helpers/validators.js";
import { LIMITS } from "../helpers/limits.js";
import { GoalType } from "../generated/prisma/enums.js";

async function getGoal(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;

  const goal = await goalService.getGoal(userId);
  res.json(goal);
}

async function createGoal(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;

  const {
    targetWeight,
    calorieGoal,
    proteinGoal,
    carbGoal,
    fatGoal,
    goalType,
  } = req.body ?? {};

  validatePositiveNumber(
    "targetWeight",
    targetWeight,
    LIMITS.TARGET_WEIGHT_MAX,
  );

  validateNonNegativeNumber(
    "calorieGoal",
    calorieGoal,
    LIMITS.CALORIE_GOAL_MAX,
  );

  validateNonNegativeNumber("proteinGoal", proteinGoal, LIMITS.MACRO_GOAL_MAX);
  validateNonNegativeNumber("carbGoal", carbGoal, LIMITS.MACRO_GOAL_MAX);
  validateNonNegativeNumber("fatGoal", fatGoal, LIMITS.MACRO_GOAL_MAX);

  validateEnum("goalType", goalType, Object.values(GoalType));

  const data: CreateGoalInput = {
    userId,
    targetWeight,
    calorieGoal,
    proteinGoal,
    carbGoal,
    fatGoal,
    goalType,
  };
  const createdGoal = await goalService.createGoal(data);
  res.status(201).json(createdGoal);
}

async function updateGoal(req: Request, res: Response) {
  const user = req.user!;
  const userId = user.id;

  const {
    targetWeight,
    calorieGoal,
    proteinGoal,
    carbGoal,
    fatGoal,
    goalType,
  } = req.body ?? {};

  const goalData: UpdateGoalInput = {};

  if (targetWeight !== undefined) {
    validatePositiveNumber(
      "targetWeight",
      targetWeight,
      LIMITS.TARGET_WEIGHT_MAX,
    );
    goalData.targetWeight = targetWeight;
  }

  if (calorieGoal !== undefined) {
    validateNonNegativeNumber(
      "calorieGoal",
      calorieGoal,
      LIMITS.CALORIE_GOAL_MAX,
    );
    goalData.calorieGoal = calorieGoal;
  }

  if (proteinGoal !== undefined) {
    validateNonNegativeNumber(
      "proteinGoal",
      proteinGoal,
      LIMITS.MACRO_GOAL_MAX,
    );
    goalData.proteinGoal = proteinGoal;
  }

  if (carbGoal !== undefined) {
    validateNonNegativeNumber("carbGoal", carbGoal, LIMITS.MACRO_GOAL_MAX);
    goalData.carbGoal = carbGoal;
  }

  if (fatGoal !== undefined) {
    validateNonNegativeNumber("fatGoal", fatGoal, LIMITS.MACRO_GOAL_MAX);
    goalData.fatGoal = fatGoal;
  }

  if (goalType !== undefined) {
    validateEnum("goalType", goalType, Object.values(GoalType));
    goalData.goalType = goalType;
  }

  if (Object.keys(goalData).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  const updatedGoals = await goalService.updateGoal(userId, goalData);
  return res.json(updatedGoals);
}

export { getGoal, createGoal, updateGoal };
