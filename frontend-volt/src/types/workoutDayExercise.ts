export type WorkoutDayExercises = {
  id: string;
  order: number;
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  restSeconds: number | null;
  exercise: {
    slug: string;
    name: string;
  };
};

export type CreateWorkoutExerciseInput = {
  exerciseId: string;
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

export type DeleteWorkoutExerciseVariables = {
  planId: string;
  dayId: string;
  dayExerciseId: string;
};
