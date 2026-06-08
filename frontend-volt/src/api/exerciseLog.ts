import useFetch from "@/hooks/useFetch";
import type {
  CreateExerciseLogInput,
  DeleteExerciseLogVariables,
  ExerciseLog,
  UpdateExerciseLogVariables,
} from "@/types/exerciseLog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workoutLogKeys } from "./workoutLog";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/workout-logs`;

export const exerciseLogKeys = {
  all: ["exerciseLog"] as const,
  lists: () => [...exerciseLogKeys.all, "list"] as const,
  list: (workoutLogId: string) =>
    [...exerciseLogKeys.lists(), workoutLogId] as const,
  details: () => [...exerciseLogKeys.all, "detail"] as const,
  detail: (workoutLogId: string, exerciseLogId: string) =>
    [...exerciseLogKeys.details(), workoutLogId, exerciseLogId] as const,
};

export function useExerciseLogs(workoutLogId: string) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: exerciseLogKeys.list(workoutLogId),
    queryFn: async () => {
      const url = `${BASE}/${workoutLogId}/exercises`;
      const data = await authedFetch<{ exerciseLogs: ExerciseLog[] }>(url);
      if (!data)
        throw new Error("Expected exercise logs list, got empty response");
      return data.exerciseLogs;
    },
  });
}

export function useExerciseLogDetail(
  workoutLogId: string,
  exerciseLogId: string,
) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: exerciseLogKeys.detail(workoutLogId, exerciseLogId),
    queryFn: async () => {
      const url = `${BASE}/${workoutLogId}/exercises/${exerciseLogId}`;
      const data = await authedFetch<ExerciseLog>(url);
      if (!data) throw new Error("Expected exercise log, got empty response");
      return data;
    },
  });
}

export function useCreateExerciseLog() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExerciseLogInput) => {
      const data = await authedFetch<ExerciseLog>(
        `${BASE}/${input.workoutLogId}/exercises`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!data)
        throw new Error("Expected created exercise log, got empty response");
      return data;
    },
    // On success takes up to 3 parameters (data returned from mutationFn,
    // variables passed to mutate, context object)
    onSuccess: (data, variables) => {
      // Creating an exercise log will update its corresponding workout log,
      // so we need to update the list, today, and that log's detail
      queryClient.invalidateQueries({ queryKey: workoutLogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workoutLogKeys.today() });
      queryClient.invalidateQueries({
        queryKey: workoutLogKeys.detail(variables.workoutLogId),
      });
      queryClient.invalidateQueries({
        queryKey: exerciseLogKeys.list(variables.workoutLogId),
      });
      queryClient.invalidateQueries({
        queryKey: exerciseLogKeys.detail(variables.workoutLogId, data.id),
      });
    },
  });
}

export function useUpdateExerciseLog() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workoutLogId,
      exerciseLogId,
      input,
    }: UpdateExerciseLogVariables) => {
      const url = `${BASE}/${workoutLogId}/exercises/${exerciseLogId}`;
      const data = await authedFetch<ExerciseLog>(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data)
        throw new Error("Expected updated exercise log, got empty response");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workoutLogKeys.detail(variables.workoutLogId),
      });
      queryClient.invalidateQueries({
        queryKey: exerciseLogKeys.list(variables.workoutLogId),
      });
      queryClient.invalidateQueries({
        queryKey: exerciseLogKeys.detail(
          variables.workoutLogId,
          variables.exerciseLogId,
        ),
      });
    },
  });
}

export function useDeleteExerciseLog() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workoutLogId,
      exerciseLogId,
    }: DeleteExerciseLogVariables) => {
      const url = `${BASE}/${workoutLogId}/exercises/${exerciseLogId}`;
      await authedFetch(url, { method: "DELETE" });
    },
    // On success takes up to 3 parameters (data returned from mutationFn,
    // variables passed to mutate, context object)
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workoutLogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workoutLogKeys.today() });
      queryClient.invalidateQueries({
        queryKey: workoutLogKeys.detail(variables.workoutLogId),
      });
      queryClient.invalidateQueries({
        queryKey: exerciseLogKeys.list(variables.workoutLogId),
      });
      queryClient.removeQueries({
        queryKey: exerciseLogKeys.detail(
          variables.workoutLogId,
          variables.exerciseLogId,
        ),
      });
    },
  });
}
