export interface CreateWorkoutDayExerciseInput {
  workoutDayId: number;
  exerciseId: string;
  order: number;
}

export interface UpdateWorkoutDayExerciseInput {
  order?: number;
}
