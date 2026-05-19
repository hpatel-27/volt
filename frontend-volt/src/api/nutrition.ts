import useFetch from "@/hooks/useFetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateNutritionInput,
  DeleteNutritionVariables,
  NutritionLog,
  NutritionLogSummary,
  NutritionPage,
  NutritionRange,
} from "@/types/nutrition";
import { FetchError } from "@/lib/errors";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/nutrition-logs`;

export const nutritionKeys = {
  all: ["nutrition"] as const,
  lists: () => [...nutritionKeys.all, "list"] as const,
  list: (params: { page: number; limit: number }) =>
    [...nutritionKeys.lists(), params] as const,
  details: () => [...nutritionKeys.all, "detail"] as const,
  detail: (date: string) => [...nutritionKeys.details(), date] as const,
  ranges: () => [...nutritionKeys.all, "range"] as const,
  range: (params: { from: string; to: string }) =>
    [...nutritionKeys.ranges(), params] as const,
  today: () => [...nutritionKeys.all, "today"] as const,
};

export function useNutritionToday(date: string) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: nutritionKeys.today(),
    queryFn: async () => {
      const url = `${BASE}/today?date=${encodeURIComponent(date)}`;
      // Server returns the summary or `null` (raw JSON null) when no log exists.
      return await authedFetch<NutritionLogSummary | null>(url);
    },
  });
}

export function useNutritionLogs(params: { page: number; limit: number }) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: nutritionKeys.list(params),
    queryFn: async () => {
      const url = `${BASE}?page=${params.page}&limit=${params.limit}`;
      const data = await authedFetch<NutritionPage>(url);
      if (!data) throw new Error("Expected nutrition page, got empty response");
      return data;
    },
  });
}

export function useNutritionRange(params: { from: string; to: string }) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: nutritionKeys.range(params),
    queryFn: async () => {
      const url = `${BASE}/range?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}`;
      const data = await authedFetch<NutritionRange>(url);
      if (!data)
        throw new Error("Expected nutrition range, got empty response");
      return data;
    },
  });
}

export function useNutritionDetail(date: string) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: nutritionKeys.detail(date),
    queryFn: async () => {
      try {
        const url = `${BASE}/${date}`;
        const data = await authedFetch<NutritionLog>(url);
        return data;
      } catch (err) {
        // Return null when looking at a specific nutrition log that doesn't exist
        // so we know to render an empty log page, which we can save if the user
        // wants to create a meal for it
        if (err instanceof FetchError && err.status === 404) return null;
        throw err;
      }
    },
  });
}

export function useCreateNutrition() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNutritionInput) => {
      const data = await authedFetch<NutritionLog>(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data) throw new Error("Expected created weight, got empty response");
      return data;
    },
    // On success takes up to 3 parameters (data returned from mutationFn,
    // variables passed to mutate, context object)
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.detail(variables.date),
      });
    },
  });
}

export function useDeleteNutrition() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date }: DeleteNutritionVariables) => {
      const url = `${BASE}/${date}`;
      await authedFetch(url, { method: "DELETE" });
    },
    // On success takes up to 3 parameters (data returned from mutationFn,
    // variables passed to mutate, context object)
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.lists() });
      queryClient.removeQueries({
        queryKey: nutritionKeys.detail(variables.date),
      });
      queryClient.invalidateQueries({ queryKey: nutritionKeys.ranges() });
    },
  });
}
