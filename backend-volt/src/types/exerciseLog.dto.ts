import type { Prisma } from "../generated/prisma/client.js";
import type { EXERCISE_REF_SELECT } from "../prisma/selects.js";
import type { SetLog } from "./setLog.dto.js";

export interface CreateExerciseLogInput {
  workoutLogId: string;
  exerciseId: string;
  notes?: string;
}

export interface UpdateExerciseLogInput {
  notes?: string | null;
}

export type ExerciseLogWithExerciseAndSets = Prisma.ExerciseLogGetPayload<{
  include: { exercise: { select: typeof EXERCISE_REF_SELECT }; sets: true };
}>;

export interface ExerciseLog {
  id: string;
  exercise: {
    id: string;
    slug: string;
    name: string;
  };
  notes?: string | null;
  sets: SetLog[];
}
