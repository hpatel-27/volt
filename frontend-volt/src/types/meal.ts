export type Meal = {
  id: string;
  name: string;
  nutritionLogId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type CreateMealVariables = {
  date: string;
  meal: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

export type DeleteMealVariables = { date: string; mealId: string };

export type UpdateMealVariables = {
  date: string;
  mealId: string;
  patch: Partial<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
};
