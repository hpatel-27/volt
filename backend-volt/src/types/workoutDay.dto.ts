export interface CreateWorkoutDayInput {
  workoutPlanId: number;
  name: string;
  order: number;
}

export interface UpdateWorkoutDayInput {
  name?: string;
  order?: number;
}
