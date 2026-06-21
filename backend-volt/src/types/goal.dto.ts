import type { GoalType } from "../generated/prisma/enums.js";

export interface CreateGoalInput {
  userId: string;
  targetWeight: number;
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
  goalType: GoalType;
}

export interface UpdateGoalInput {
  targetWeight?: number;
  calorieGoal?: number;
  proteinGoal?: number;
  carbGoal?: number;
  fatGoal?: number;
  goalType?: GoalType;
}

export interface Goal {
  id: string;
  targetWeight: number; // float lbs
  calorieGoal: number; // kcal
  proteinGoal: number; // float grams
  carbGoal: number; // float grams
  fatGoal: number; // float grams
  goalType: GoalType; // CUT, BULK, MAINTAIN
}
