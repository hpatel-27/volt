export type Plan = {
  id: string;
  createdAt: string;
  name: string;
  // workoutDays?: WorkoutDay[];
};

export type PlanFilter = "All" | "Strength" | "Hypertrophy" | "Weight Loss";
