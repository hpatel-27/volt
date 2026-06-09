import type { ExerciseLog } from "./exerciseLog";

export type CreateWorkoutLogInput = {
  date: string;
  workoutDayId?: string | null;
};

export type UpdateWorkoutLogInput = {
  date?: string;
  workoutDayId?: string | null;
};

export type UpdateWorkoutLogVariables = {
  id: string;
  input: UpdateWorkoutLogInput;
};
export type DeleteWorkoutLogVariables = { id: string };

export type WorkoutLog = {
  id: string;
  date: string;
  workoutDay?: { id: string; name: string } | null;
  exercises?: ExerciseLog[];
};

export type WorkoutLogSummary = {
  id: string;
  date: string;
  exerciseCount: number;
  // Total tonnage for the session: Σ (weight × reps) across all sets, in lbs.
  totalVolume: number;
  workoutDay: { id: string; name: string } | null;
};

export type WorkoutLogPage = {
  workoutLogs: WorkoutLogSummary[];
  total: number;
  page: number;
  limit: number;
};
