import useFetch from "@/hooks/useFetch";
import type {
  CreateSetLogVariables,
  DeleteSetLogVariables,
  SetLog,
  UpdateSetLogVariables,
} from "@/types/setLog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workoutLogKeys } from "./workoutLog";
import { exerciseLogKeys } from "./exerciseLog";

// We have the full nested route for the list GET and POST
const FULL_BASE = `${import.meta.env.VITE_API_BASE_URL}/workout-logs`;
// Flat route for working with a specific set
const FLAT_BASE = `${import.meta.env.VITE_API_BASE_URL}/sets`;

export const setLogKeys = {
  all: ["setLog"] as const,
  lists: () => [...setLogKeys.all, "list"] as const,
  list: (workoutLogId: string, exerciseLogId: string) =>
    [...setLogKeys.lists(), workoutLogId, exerciseLogId] as const,
  details: () => [...setLogKeys.all, "detail"] as const,
  detail: (setLogId: string) => [...setLogKeys.details(), setLogId] as const,
};

export function useSetLogs(workoutLogId: string, exerciseLogId: string) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: setLogKeys.list(workoutLogId, exerciseLogId),
    queryFn: async () => {
      const url = `${FULL_BASE}/${workoutLogId}/exercises/${exerciseLogId}/sets`;
      const data = await authedFetch<SetLog[]>(url);
      if (!data) throw new Error("Expected set logs list, got empty response");
      return data;
    },
  });
}

export function useSetLogDetail(setLogId: string) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: setLogKeys.detail(setLogId),
    queryFn: async () => {
      const url = `${FLAT_BASE}/${setLogId}`;
      const data = await authedFetch<SetLog>(url);
      if (!data) throw new Error("Expected set log, got empty response");
      return data;
    },
  });
}

export function useCreateSetLog() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workoutLogId,
      exerciseLogId,
      input,
    }: CreateSetLogVariables) => {
      const data = await authedFetch<SetLog>(
        `${FULL_BASE}/${workoutLogId}/exercises/${exerciseLogId}/sets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!data)
        throw new Error("Expected created set log, got empty response");
      return data;
    },
    // On success takes up to 3 parameters (data returned from mutationFn,
    // variables passed to mutate, context object)
    onSuccess: (data, variables) => {
      // Creating a set log will update its corresponding exercise log,
      // so we need to update that workout log's and exercise log's list and detail
      queryClient.invalidateQueries({
        queryKey: workoutLogKeys.detail(variables.workoutLogId),
      });
      queryClient.invalidateQueries({ queryKey: exerciseLogKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: exerciseLogKeys.detail(
          variables.workoutLogId,
          variables.exerciseLogId,
        ),
      });
      // update the sets list query as well
      queryClient.invalidateQueries({ queryKey: setLogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: setLogKeys.detail(data.id) });
    },
  });
}

export function useUpdateSetLog() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ setLogId, input }: UpdateSetLogVariables) => {
      const url = `${FLAT_BASE}/${setLogId}`;
      const data = await authedFetch<SetLog>(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data)
        throw new Error("Expected updated set log, got empty response");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workoutLogKeys.detail(variables.workoutLogId),
      });
      queryClient.invalidateQueries({ queryKey: exerciseLogKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: exerciseLogKeys.detail(
          variables.workoutLogId,
          variables.exerciseLogId,
        ),
      });
      // update the sets list query as well
      queryClient.invalidateQueries({ queryKey: setLogKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: setLogKeys.detail(variables.setLogId),
      });
    },
  });
}

export function useDeleteSetLog() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ setLogId }: DeleteSetLogVariables) => {
      const url = `${FLAT_BASE}/${setLogId}`;
      await authedFetch(url, { method: "DELETE" });
    },
    // On success takes up to 3 parameters (data returned from mutationFn,
    // variables passed to mutate, context object)
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workoutLogKeys.detail(variables.workoutLogId),
      });
      queryClient.invalidateQueries({ queryKey: exerciseLogKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: exerciseLogKeys.detail(
          variables.workoutLogId,
          variables.exerciseLogId,
        ),
      });
      queryClient.invalidateQueries({ queryKey: setLogKeys.lists() });
      queryClient.removeQueries({
        queryKey: setLogKeys.detail(variables.setLogId),
      });
    },
  });
}
