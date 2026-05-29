import type { WorkoutDay } from "./workoutDay";

export type WorkoutPlan = {
  id: string;
  name: string;
  type?: string;
  createdAt: string;
  updatedAt: string;
  workoutDays?: WorkoutDay[];
};

export type WorkoutPlanEntry = {
  id: string;
  name: string;
  type?: string;
};

export type WorkoutPlanPage = {
  workoutPlans: WorkoutPlanSummary[];
  total: number;
  page: number;
  limit: number;
};

export type WorkoutPlanSummary = {
  id: string;
  name: string;
  type?: string;
  daysPerWeek: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkoutPlanInput = { name: string; type?: string };
export type UpdateWorkoutPlanInput = { name?: string; type?: string };

export type UpdateWorkoutPlanVariables = {
  id: string;
  input: UpdateWorkoutPlanInput;
};
export type DeleteWorkoutPlanVariables = { id: string };

export type PlanFilter = "All" | "Strength" | "Hypertrophy" | "Weight Loss";
