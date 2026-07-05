// Shared constants
import type { Goal } from "./goal";

// Limit for pagination
export const LIMIT = 10;

// Nutrition Goals
export const GOALS = {
  calories: 2000,
  protein: 140, // 560 calories
  carbs: 210, // 840 calories
  fat: 50, // 450 calories
};

// The daily nutrition targets the dashboard/nutrition views read.
export type EffectiveGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

// Resolve a user's saved goals into the daily targets. Falls back to
// the shared defaults while goals are loading (`undefined`) or unset (`null`),
// and renames the API's `*Goal` fields to the `{ calories, protein, carbs, fat }`.
export function resolveGoals(goal: Goal | null | undefined): EffectiveGoals {
  if (!goal) return { ...GOALS };
  return {
    calories: goal.calorieGoal,
    protein: goal.proteinGoal,
    carbs: goal.carbGoal,
    fat: goal.fatGoal,
  };
}

export const WORKOUT_TYPES = [
  "OTHER",
  "STRENGTH",
  "HYPERTROPHY",
  "WEIGHT_LOSS",
];

// Goal / activity types
export const GOAL_TYPES = ["CUT", "MAINTAIN", "BULK"] as const;

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Shared across skeleton, empty, and resolved states so the dashboard doesn't
// shift height as data loads in.
export const MIN_H = "min-h-40";
