import type { Meal } from "./meal";

export type NutritionLog = {
  id: string;
  date: string;
  meals: Meal[];
};

export type NutritionPage = {
  nutritionLogs: NutritionLogSummary[];
  total: number;
  page: number;
  limit: number;
};

export type Totals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionLogSummary = {
  id: string;
  date: string;
  totals: Totals;
  mealCount?: number;
};

export type NutritionRange = {
  logs: NutritionLog[];
  total: number;
};

export type CreateNutritionInput = {
  date: string;
};

export type DeleteNutritionVariables = { date: string };

export type DayStripSelected = { selectedDate: string };
export type DayStripProps = { props: DayStripSelected };
