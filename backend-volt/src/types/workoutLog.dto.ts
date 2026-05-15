export interface CreateWorkoutLogInput {
  userId: string;
  date?: string;
  workoutDayId?: string;
}

export interface UpdateWorkoutLogInput {
  date?: string;
  workoutDayId?: string | null;
}
