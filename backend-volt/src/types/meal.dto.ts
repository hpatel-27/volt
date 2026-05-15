export interface CreateMealInput {
  nutritionLogId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UpdateMealInput {
  name?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}
