import useFetch from "@/hooks/useFetch";
import type { Plan } from "@/types/workoutPlan";
import { useQuery } from "@tanstack/react-query";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/workout-plans`;

export const planKeys = {
  all: ["workoutPlan"] as const,
  lists: () => [...planKeys.all, "list"] as const,
  list: () => [...planKeys.lists()] as const,
  details: () => [...planKeys.all, "detail"] as const,
  detail: (planId: string) => [...planKeys.details(), planId] as const,
};

export function usePlans() {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: planKeys.list(),
    queryFn: async () => {
      const url = `${BASE}`;
      const data = await authedFetch<Plan[]>(url);
      if (!data)
        throw new Error("Expected workout plan list, got empty response");
      return data;
    },
  });
}
