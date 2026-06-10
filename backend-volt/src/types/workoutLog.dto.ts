import type { Prisma } from "../generated/prisma/client.js";
import { EXERCISE_REF_SELECT } from "../prisma/selects.js";
import type { ExerciseLog } from "./exerciseLog.dto.js";

export interface CreateWorkoutLogInput {
  userId: string;
  date?: string;
  workoutDayId?: string;
}

export interface UpdateWorkoutLogInput {
  date?: string;
  workoutDayId?: string | null;
}

export const WORKOUT_LOG_SUMMARY_INCLUDE = {
  workoutDay: { select: { id: true, name: true } },
  _count: { select: { exerciseLogs: true } },
  // Per-set scalars needed to compute total volume (Σ weight × reps). Only the two
  // numeric columns are hydrated, so the summary query stays lightweight.
  exerciseLogs: { select: { sets: { select: { weight: true, reps: true } } } },
} as const satisfies Prisma.WorkoutLogInclude;

export type WorkoutLogWithSummary = Prisma.WorkoutLogGetPayload<{
  include: typeof WORKOUT_LOG_SUMMARY_INCLUDE;
}>;

export const WORKOUT_LOG_DETAIL_INCLUDE = {
  workoutDay: { select: { id: true, name: true } },
  exerciseLogs: {
    include: {
      exercise: { select: EXERCISE_REF_SELECT },
      sets: { orderBy: { setNumber: "asc" } },
    },
  },
} as const satisfies Prisma.WorkoutLogInclude;

export type WorkoutLogWithDetail = Prisma.WorkoutLogGetPayload<{
  include: typeof WORKOUT_LOG_DETAIL_INCLUDE;
}>;

export interface WorkoutLog {
  id: string;
  date: string;
  workoutDay?: { id: string; name: string } | null;
  exercises?: ExerciseLog[];
}

export interface WorkoutLogSummary {
  id: string;
  date: string;
  exerciseCount: number;
  // Total tonnage for the session: Σ (weight × reps) across all sets, in lbs.
  totalVolume: number;
  workoutDay: { id: string; name: string } | null;
}
