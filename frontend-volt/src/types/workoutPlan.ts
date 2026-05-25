// export type Plan = {
//   id: string;
//   createdAt: string;
//   name: string;
//   workoutDays?: WorkoutDay[];
// };

export type WorkoutPlanPage = {
  workoutPlans: WorkoutPlanSummary[];
  total: number;
  page: number;
  limit: number;
};

export type WorkoutPlanSummary = {
  id: string;
  name: string;
  type?: string;
  daysPerWeek: number;
  createdAt: string;
};

export type PlanFilter = "All" | "Strength" | "Hypertrophy" | "Weight Loss";
