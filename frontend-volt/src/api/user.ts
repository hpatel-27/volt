import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useFetch from "@/hooks/useFetch";
import type { UpdateUserInput, User } from "@/types/user";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/users`;

export const userKeys = {
  all: ["user"] as const,
  me: () => [...userKeys.all, "me"] as const,
};

export function useCurrentUser() {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: async () => {
      const data = await authedFetch<User>(`${BASE}/me`);
      if (!data) throw new Error("Expected current user, got empty response");
      return data;
    },
  });
}

export function useUpdateProfile() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateUserInput) => {
      const url = `${BASE}/me`;
      const data = await authedFetch<User>(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data)
        throw new Error("Expected updated user profile, got empty response");
      return data;
    },
    onSuccess: () => {
      // Refetch the user profile info
      queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}

export function useDeleteAccount() {
  const authedFetch = useFetch();

  return useMutation({
    mutationFn: async () => {
      // 204 No Content on success — the user and all their data are gone.
      await authedFetch(`${BASE}/me`, { method: "DELETE" });
    },
  });
}
