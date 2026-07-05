import useFetch from "@/hooks/useFetch";
import type { CreateGoalInput, Goal, UpdateGoalInput } from "@/types/goal";
import { FetchError } from "@/lib/errors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/goals`;

export const goalKeys = {
  all: ["goals"] as const,
  me: () => [...goalKeys.all, "me"] as const,
};

export function useGoals() {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: goalKeys.me(),
    // Backend 404s until the user sets goals for the first time.
    // We translate expected goals into `null` so callers can branch on
    // data === null ("no goals yet") instead of inspecting FetchError. Any other
    // status still throws and surfaces as a real query error.
    queryFn: async (): Promise<Goal | null> => {
      try {
        const data = await authedFetch<Goal>(BASE);
        if (!data)
          throw new Error("Expected user's goal object, got empty response");
        return data;
      } catch (err) {
        if (err instanceof FetchError && err.status === 404) return null;
        throw err;
      }
    },
  });
}

export function useCreateGoals() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const data = await authedFetch<Goal>(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data)
        throw new Error("Expected created goals for user, got empty response");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.me() });
    },
  });
}

export function useUpdateGoals() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateGoalInput) => {
      const data = await authedFetch<Goal>(BASE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data)
        throw new Error("Expected updated goals for user, got empty response");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.me() });
    },
  });
}
