import useFetch from "@/hooks/useFetch";
import { FetchError } from "@/lib/errors";
import type {
  CreateWorkoutLogInput,
  DeleteWorkoutLogVariables,
  UpdateWorkoutLogVariables,
  WorkoutLog,
  WorkoutLogPage,
  WorkoutLogSummary,
} from "@/types/workoutLog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/workout-logs`;

export const workoutLogKeys = {
  all: ["workoutLog"] as const,
  lists: () => [...workoutLogKeys.all, "list"] as const,
  list: (params: { page: number; limit: number }) =>
    [...workoutLogKeys.lists(), params] as const,
  details: () => [...workoutLogKeys.all, "detail"] as const,
  detail: (logId: string) => [...workoutLogKeys.details(), logId] as const,
  today: () => [...workoutLogKeys.all, "today"] as const,
};

export function useWorkoutLogsToday(date: string) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: workoutLogKeys.today(),
    queryFn: async () => {
      // Today route passes date, since we can compute the local date for the user,
      // and send that to the server, since they might not be in the same timezone
      const url = `${BASE}/today?date=${encodeURIComponent(date)}`;
      // A day can hold multiple sessions, so the server returns an array of
      // summaries (empty when nothing has been logged today).
      const data = await authedFetch<WorkoutLogSummary[]>(url);
      return data ?? [];
    },
  });
}

export function useWorkoutLogs(params: { page: number; limit: number }) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: workoutLogKeys.list(params),
    queryFn: async () => {
      const url = `${BASE}?page=${params.page}&limit=${params.limit}`;
      const data = await authedFetch<WorkoutLogPage>(url);
      if (!data)
        throw new Error("Expected workout log page, got empty response");
      return data;
    },
  });
}

export function useWorkoutLogDetail(logId: string) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: workoutLogKeys.detail(logId),
    queryFn: async () => {
      try {
        const url = `${BASE}/${logId}`;
        const data = await authedFetch<WorkoutLog>(url);
        return data;
      } catch (err) {
        // Return null when looking at a specific workout log that doesn't exist
        // so we know to render an empty log page, which we can save if the user
        // wants to create an entry for it
        if (err instanceof FetchError && err.status === 404) return null;
        throw err;
      }
    },
  });
}

export function useCreateWorkoutLog() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkoutLogInput) => {
      const data = await authedFetch<WorkoutLog>(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data)
        throw new Error("Expected created workout log, got empty response");
      return data;
    },
    // On success takes up to 3 parameters (data returned from mutationFn,
    // variables passed to mutate, context object)
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workoutLogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workoutLogKeys.today() });
      queryClient.invalidateQueries({
        queryKey: workoutLogKeys.detail(data.id),
      });
    },
  });
}

export function useUpdateWorkoutLog() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: UpdateWorkoutLogVariables) => {
      const url = `${BASE}/${id}`;
      const data = await authedFetch<WorkoutLog>(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data)
        throw new Error("Expected updated workout log, got empty response");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workoutLogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workoutLogKeys.today() });
      queryClient.invalidateQueries({
        queryKey: workoutLogKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteWorkoutLog() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteWorkoutLogVariables) => {
      const url = `${BASE}/${id}`;
      await authedFetch(url, { method: "DELETE" });
    },
    // On success takes up to 3 parameters (data returned from mutationFn,
    // variables passed to mutate, context object)
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workoutLogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workoutLogKeys.today() });
      queryClient.removeQueries({
        queryKey: workoutLogKeys.detail(variables.id),
      });
    },
  });
}
