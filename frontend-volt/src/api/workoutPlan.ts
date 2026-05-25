import useFetch from "@/hooks/useFetch";
import type { WorkoutPlanPage } from "@/types/workoutPlan";
import { useQuery } from "@tanstack/react-query";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/workout-plans`;

export const workoutPlanKeys = {
  all: ["workoutPlan"] as const,
  lists: () => [...workoutPlanKeys.all, "list"] as const,
  list: (params: { page: number; limit: number }) =>
    [...workoutPlanKeys.lists(), params] as const,
  details: () => [...workoutPlanKeys.all, "detail"] as const,
  detail: (planId: string) => [...workoutPlanKeys.details(), planId] as const,
};

export function useWorkoutPlans(params: { page: number; limit: number }) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: workoutPlanKeys.list(params),
    queryFn: async () => {
      const url = `${BASE}?page=${params.page}&limit=${params.limit}`;
      const data = await authedFetch<WorkoutPlanPage>(url);
      if (!data)
        throw new Error("Expected workout plan list, got empty response");
      return data;
    },
  });
}
