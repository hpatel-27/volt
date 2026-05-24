export interface CreateWorkoutDayExerciseInput {
  workoutDayId: string;
  exerciseId: string;
  order: number;
}

export interface UpdateWorkoutDayExerciseInput {
  order?: number;
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
