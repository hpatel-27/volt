import type { WorkoutDayExercises } from "./workoutDayExercise";

export type WorkoutDay = {
  id: string;
  name: string;
  order: number;
  exercises?: WorkoutDayExercises[];
};

export type CreateWorkoutDayInput = { name: string };
export type UpdateWorkoutDayInput = { name?: string };

export type WorkoutDayEntry = { id: string; name: string };

export type CreateWorkoutDayVariables = {
  planId: string;
  input: CreateWorkoutDayInput;
};
export type UpdateWorkoutDayVariables = {
  planId: string;
  dayId: string;
  input: UpdateWorkoutDayInput;
};
export type DeleteWorkoutDayVariables = { planId: string; dayId: string };
