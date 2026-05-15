export interface CreateWorkoutDayExerciseInput {
  workoutDayId: string;
  exerciseId: string;
  order: number;
}

export interface UpdateWorkoutDayExerciseInput {
  order?: number;
}
