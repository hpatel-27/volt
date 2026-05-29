import type { ExerciseRef } from "./exercise";

export type WorkoutDayExercises = {
  id: string;
  order: number;
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  restSeconds: number | null;
  exercise: ExerciseRef;
};

export type CreateWorkoutExerciseInput = {
  exerciseId: string;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  restSeconds?: number;
};

export type UpdateWorkoutExerciseInput = {
  exerciseId?: string;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  restSeconds?: number;
};

export type CreateWorkoutExerciseVariables = {
  planId: string;
  dayId: string;
  input: CreateWorkoutExerciseInput;
};

export type UpdateWorkoutExerciseVariables = {
  planId: string;
  dayId: string;
  dayExerciseId: string;
  input: UpdateWorkoutExerciseInput;
};

export type DeleteWorkoutExerciseVariables = {
  planId: string;
  dayId: string;
  dayExerciseId: string;
};
