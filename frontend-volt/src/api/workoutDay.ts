import { useMutation, useQueryClient } from "@tanstack/react-query";
import useFetch from "@/hooks/useFetch";
import { workoutPlanKeys } from "@/api/workoutPlan";
import type {
  CreateWorkoutDayVariables,
  DeleteWorkoutDayVariables,
  UpdateWorkoutDayVariables,
  WorkoutDay,
} from "@/types/workoutDay";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/workout-plans`;

// Days are always loaded through the plan-detail query (the plan owns its
// days), so there's no dedicated `workoutDayKeys` cache, mutations
// invalidate the parent plan's detail.

export function useCreateWorkoutDay() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, input }: CreateWorkoutDayVariables) => {
      const url = `${BASE}/${planId}/days`;
      const data = await authedFetch<WorkoutDay>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data)
        throw new Error("Expected created workout day, got empty response");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(variables.planId),
      });
    },
  });
}

export function useUpdateWorkoutDay() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, dayId, input }: UpdateWorkoutDayVariables) => {
      const url = `${BASE}/${planId}/days/${dayId}`;
      const data = await authedFetch<WorkoutDay>(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data)
        throw new Error("Expected updated workout day, got empty response");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(variables.planId),
      });
    },
  });
}

export function useDeleteWorkoutDay() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, dayId }: DeleteWorkoutDayVariables) => {
      const url = `${BASE}/${planId}/days/${dayId}`;
      await authedFetch(url, { method: "DELETE" });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(variables.planId),
      });
    },
  });
}
