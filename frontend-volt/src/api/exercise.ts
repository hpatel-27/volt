import useFetch from "@/hooks/useFetch";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ExerciseListParams, ExercisePage } from "@/types/exercise";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/exercises`;

export const exerciseKeys = {
  all: ["exercise"] as const,
  lists: () => [...exerciseKeys.all, "list"] as const,
  list: (params: ExerciseListParams) =>
    [...exerciseKeys.lists(), params] as const,
};

export function useExercises(params: ExerciseListParams) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: exerciseKeys.list(params),
    queryFn: async () => {
      const url = params.q
        ? `${BASE}?page=${params.page}&limit=${params.limit}&q=${encodeURIComponent(params.q)}`
        : `${BASE}?page=${params.page}&limit=${params.limit}`;
      const data = await authedFetch<ExercisePage>(url);
      if (!data)
        throw new Error("Expected exercise library list, got empty response");
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
