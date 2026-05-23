import { Prisma } from "../generated/prisma/client.js";
import type {
  MealModel,
  NutritionLogModel,
} from "../generated/prisma/models.js";
import type {
  NutritionLog,
  NutritionLogSummary,
  Totals,
} from "../types/nutrition.dto.js";
import { toMealDto } from "./meal.mapper.js";

// Matches a log fetched with `include: { meals: true }`
export type NutritionLogWithMeals = Prisma.NutritionLogGetPayload<{
  include: { meals: true };
}>;

function toNutritionDto(log: NutritionLogModel): NutritionLog {
  const id = log.id;
  const date = log.date.toISOString().slice(0, 10);
  return { id, date };
}

// Convert raw Prisma NutritionLog into the `NutritionLog` DTO returned by the API.
// Strips `userId` and formats `date` as a date-only ISO string.
// If a timestamp is ever needed, change it here only.
function toNutritionMealDto(log: NutritionLogWithMeals): NutritionLog {
  const id = log.id;
  const date = log.date.toISOString().slice(0, 10);
  const meals = log.meals.map((m) => toMealDto(m));
  return { id, date, meals };
}

// Sum a log's meals into a single Totals object.
// Reusable across every call site that needs aggregated macros from meal rows.
function sumMealTotals(meals: MealModel[]): Totals {
  const totals = meals.reduce(
    (prev, current) => {
      return {
        calories: prev.calories + current.calories,
        protein: prev.protein + current.protein,
        carbs: prev.carbs + current.carbs,
        fat: prev.fat + current.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return totals;
}

// Assemble the log summary. Totals/mealCount are derived, so
// caller computes them (groupBy or sumMealTotals) and passes them here.
// This mapper only owns the shape and date formatting
function toNutritionSummaryDto(
  log: NutritionLogModel,
  totals: Totals,
  mealCount: number,
): NutritionLogSummary {
  const id = log.id;
  const date = log.date.toISOString().slice(0, 10);
  return { id, date, totals, mealCount };
}

export {
  toNutritionDto,
  toNutritionMealDto,
  sumMealTotals,
  toNutritionSummaryDto,
};
