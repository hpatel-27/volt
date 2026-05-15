export interface CreateExerciseLogInput {
  workoutLogId: string;
  exerciseId: string;
  notes?: string;
}

export interface UpdateExerciseLogInput {
  notes?: string | null;
}
