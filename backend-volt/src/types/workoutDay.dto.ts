import type { WorkoutDayExercise } from "./workoutDayExercise.dto.js";

export interface CreateWorkoutDayInput {
  workoutPlanId: string;
  name: string;
  order: number;
}

export interface UpdateWorkoutDayInput {
  name?: string;
}

// API response shape for the workout day list endpoint (GET /)
export interface WorkoutDay {
  id: string;
  name: string;
  order: number;
}

// API response shape for a workout day inside a plan detail response (GET, UPDATE /:dayId)
export interface WorkoutDayDetail {
  id: string;
  name: string;
  order: number;
  exercises: WorkoutDayExercise[];
}
