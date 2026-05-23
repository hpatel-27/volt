import type { MealModel } from "../generated/prisma/models.js";
import type { Meal } from "../types/meal.dto.js";

// Removes the nutritionLogId from the Meal
function toMealDto(meal: MealModel): Meal {
  return {
    id: meal.id,
    name: meal.name,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
  };
}

export { toMealDto };
