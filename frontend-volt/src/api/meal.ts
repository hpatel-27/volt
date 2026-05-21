import useFetch from "@/hooks/useFetch";
import type {
  CreateMealVariables,
  DeleteMealVariables,
  Meal,
  UpdateMealVariables,
} from "@/types/meal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nutritionKeys } from "./nutrition";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/nutrition-logs`;

export const mealKeys = {
  all: ["meal"] as const,
  lists: () => [...mealKeys.all, "list"] as const,
  list: (date: string) => [...mealKeys.lists(), date] as const,
  details: () => [...mealKeys.all, "detail"] as const,
  detail: (date: string, mealId: string) =>
    [...mealKeys.details(), date, mealId] as const,
};

export function useMeals(date: string) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: mealKeys.list(date),
    queryFn: async () => {
      const url = `${BASE}/${date}/meals`;
      const data = await authedFetch<Meal[]>(url);
      if (!data) throw new Error("Expected meal list, got empty response");
      return data;
    },
  });
}

export function useMealDetail(date: string, mealId: string) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: mealKeys.detail(date, mealId),
    queryFn: async () => {
      const url = `${BASE}/${date}/meals/${mealId}`;
      const data = await authedFetch<Meal>(url);
      if (!data) throw new Error("Expected meal detail, got empty response");
      return data;
    },
  });
}

export function useMealCreate() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMealVariables) => {
      const data = await authedFetch<Meal>(`${BASE}/${input.date}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.meal),
      });
      if (!data) throw new Error("Expected created meal, got empty response");
      return data;
    },
    // On success takes up to 3 parameters (data returned from mutationFn,
    // variables passed to mutate, context object)
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.ranges(),
      });
      queryClient.invalidateQueries({ queryKey: nutritionKeys.today() });
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.detail(variables.date),
      });
      queryClient.invalidateQueries({
        queryKey: mealKeys.list(variables.date),
      });
    },
  });
}

export function useMealUpdate() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMealVariables) => {
      const url = `${BASE}/${input.date}/meals/${input.mealId}`;
      const data = await authedFetch<Meal>(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.patch),
      });
      if (!data) throw new Error("Expected updated meal, got empty response");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.detail(variables.date),
      });
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.ranges(),
      });
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.today(),
      });
      queryClient.invalidateQueries({
        queryKey: mealKeys.list(variables.date),
      });
      queryClient.invalidateQueries({
        queryKey: mealKeys.detail(variables.date, variables.mealId),
      });
    },
  });
}

export function useMealDelete() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteMealVariables) => {
      // Returns 204 No Content
      await authedFetch<Meal>(`${BASE}/${input.date}/meals/${input.mealId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
    },
    // On success takes up to 3 parameters (data returned from mutationFn,
    // variables passed to mutate, context object)
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.ranges(),
      });
      queryClient.invalidateQueries({ queryKey: nutritionKeys.today() });
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.detail(variables.date),
      });
      queryClient.invalidateQueries({
        queryKey: mealKeys.list(variables.date),
      });
      queryClient.removeQueries({
        queryKey: mealKeys.detail(variables.date, variables.mealId),
      });
    },
  });
}
