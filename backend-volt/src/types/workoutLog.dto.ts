export interface CreateWorkoutLogInput {
  userId: number;
  date?: string;
  workoutDayId?: number;
}

export interface UpdateWorkoutLogInput {
  date?: string;
  workoutDayId?: number | null;
}
