export interface CreateWorkoutDayInput {
  workoutPlanId: string;
  name: string;
  order: number;
}

export interface UpdateWorkoutDayInput {
  name?: string;
  order?: number;
}
