import useFetch from "@/hooks/useFetch";
import { useQuery } from "@tanstack/react-query";
import type {
  NutritionLog,
  NutritionPage,
  NutritionRange,
} from "@/types/nutrition";

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
};

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
      const url = `${BASE}/${date}`;
      const data = await authedFetch<NutritionLog>(url);
      if (!data)
        throw new Error("Expected nutrition detail, got empty response");
      return data;
    },
  });
}
