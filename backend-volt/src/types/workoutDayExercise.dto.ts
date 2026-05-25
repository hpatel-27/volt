export interface CreateWorkoutDayExerciseInput {
  workoutDayId: string;
  exerciseId: string;
  order: number;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  restSeconds?: number;
}

export interface UpdateWorkoutDayExerciseInput {
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  restSeconds?: number;
}

// API response shape for one exercise slot on a workout day.
// `exercise` is denormalized: only the fields a UI actually needs.
export interface WorkoutDayExercise {
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
}
