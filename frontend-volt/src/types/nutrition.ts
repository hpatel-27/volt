import type { Meal } from "./meal";

export type NutritionLog = {
  id: string;
  userId: string;
  date: string;
  meals: Meal[];
};

export type NutritionPage = {
  nutritionLogs: NutritionLog[];
  total: number;
  page: number;
  limit: number;
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
