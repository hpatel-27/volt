export interface CreateExerciseLogInput {
  workoutLogId: number;
  exerciseId: string;
  notes?: string;
}

export interface UpdateExerciseLogInput {
  notes?: string | null;
}
