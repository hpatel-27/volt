import { useMutation, useQueryClient } from "@tanstack/react-query";
import useFetch from "@/hooks/useFetch";
import { workoutPlanKeys } from "@/api/workoutPlan";
import type {
  CreateWorkoutExerciseVariables,
  DeleteWorkoutExerciseVariables,
  WorkoutDayExercises,
} from "@/types/workoutDayExercise";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/workout-plans`;

export function useCreateWorkoutExercise() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      dayId,
      input,
    }: CreateWorkoutExerciseVariables) => {
      const url = `${BASE}/${planId}/days/${dayId}/exercises`;
      const data = await authedFetch<WorkoutDayExercises>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data)
        throw new Error("Expected created exercise, got empty response");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(variables.planId),
      });
    },
  });
}

export function useDeleteWorkoutExercise() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      dayId,
      dayExerciseId,
    }: DeleteWorkoutExerciseVariables) => {
      const url = `${BASE}/${planId}/days/${dayId}/exercises/${dayExerciseId}`;
      await authedFetch(url, { method: "DELETE" });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workoutPlanKeys.detail(variables.planId),
      });
    },
  });
}
