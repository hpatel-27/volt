import type { SetLog } from "./setLog";

export type ExerciseLog = {
  id: string;
  exercise: {
    id: string;
    slug: string;
    name: string;
  };
  notes?: string | null;
  sets: SetLog[];
};

export type CreateExerciseLogInput = {
  workoutLogId: string;
  exerciseId: string;
  notes?: string | null;
};

export type UpdateExerciseLogInput = {
  exerciseId?: string;
  notes?: string;
};

export type UpdateExerciseLogVariables = {
  workoutLogId: string;
  exerciseLogId: string;
  input: UpdateExerciseLogInput;
};

export type DeleteExerciseLogVariables = {
  workoutLogId: string;
  exerciseId: string;
};
