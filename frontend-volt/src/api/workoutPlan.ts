import useFetch from "@/hooks/useFetch";
import type {
  CreateWorkoutPlanInput,
  DeleteWorkoutPlanVariables,
  UpdateWorkoutPlanVariables,
  WorkoutPlan,
  WorkoutPlanPage,
  WorkoutPlanSummary,
} from "@/types/workoutPlan";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/api/user";
import type { User } from "@/types/user";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/workout-plans`;

export const workoutPlanKeys = {
  all: ["workoutPlan"] as const,
  lists: () => [...workoutPlanKeys.all, "list"] as const,
  list: (params: { page: number; limit: number }) =>
    [...workoutPlanKeys.lists(), params] as const,
  active: () => [...workoutPlanKeys.all, "active"] as const,
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

export function useActiveWorkoutPlan() {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: workoutPlanKeys.active(),
    queryFn: async () => {
      const url = `${BASE}/active`;
      return await authedFetch<WorkoutPlanSummary | null>(url);
    },
  });
}

export function useActivateWorkoutPlan() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const data = await authedFetch<{ activePlanId: string }>(
        `${BASE}/${planId}/activate`,
        { method: "POST" },
      );
      if (!data)
        throw new Error("Expected activate response, got empty response");
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<User>(userKeys.me(), (prev) =>
        prev ? { ...prev, activePlanId: data.activePlanId } : prev,
      );
      queryClient.invalidateQueries({ queryKey: workoutPlanKeys.active() });
      queryClient.invalidateQueries({ queryKey: workoutPlanKeys.lists() });
    },
  });
}

export function useWorkoutPlanDetail(
  id: string,
  options?: { enabled?: boolean },
) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: workoutPlanKeys.detail(id),
    // Gate so dependent callers (e.g. "load the active plan's days") don't fire
    // with an empty id before the prerequisite query has resolved.
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const url = `${BASE}/${id}`;
      const data = await authedFetch<WorkoutPlan>(url);
      if (!data)
        throw new Error("Expected workout plan detail, got empty response");
      return data;
    },
  });
}

export function useCreateWorkoutPlan() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkoutPlanInput) => {
      const data = await authedFetch<WorkoutPlanSummary>(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data)
        throw new Error("Expected created workout plan, got empty response");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutPlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workoutPlanKeys.active() });
    },
  });
}

export function useUpdateWorkoutPlan() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: UpdateWorkoutPlanVariables) => {
      const url = `${BASE}/${id}`;
      const data = await authedFetch<WorkoutPlanSummary>(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data)
        throw new Error("Expected updated workout plan, got empty response");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workoutPlanKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteWorkoutPlan() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteWorkoutPlanVariables) => {
      const url = `${BASE}/${id}`;
      await authedFetch(url, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutPlanKeys.lists() });
      // Removing the detail query indicates to the observer to refetch that data
      // in the timeframe before the mutation navigates the user back to the plans
      // page, so let the gc handle invalidating it after it expires
    },
  });
}
