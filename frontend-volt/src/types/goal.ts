export type Goal = {
  id: string;
  targetWeight: number; // float lbs
  calorieGoal: number; // kcal
  proteinGoal: number; // float grams
  carbGoal: number; // float grams
  fatGoal: number; // float grams
  goalType: string; // CUT, BULK, MAINTAIN
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateGoalInput = {
  targetWeight: number; // float lbs
  calorieGoal: number; // kcal
  proteinGoal: number; // float grams
  carbGoal: number; // float grams
  fatGoal: number; // float grams
  goalType: string; // CUT, BULK, MAINTAIN
};

export type UpdateGoalInput = {
  targetWeight?: number; // float lbs
  calorieGoal?: number; // kcal
  proteinGoal?: number; // float grams
  carbGoal?: number; // float grams
  fatGoal?: number; // float grams
  goalType?: string; // CUT, BULK, MAINTAIN
};
