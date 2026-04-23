export interface CreateNutritionLogInput {
  userId: number;
  date: string; // ISO 8601 format
}

export interface UpdateNutritionLogInput {
  date?: string; // ISO 8601 format
}
