export interface CreateNutritionLogInput {
  userId: string;
  date: string; // ISO 8601 format
}

// NutritionLog date is now the URL key (/:date), so date cannot be updated via PATCH.
// This type is kept for forward-extensibility if other fields are added to NutritionLog.
export interface UpdateNutritionLogInput {
  date?: string; // ISO 8601 format
}
