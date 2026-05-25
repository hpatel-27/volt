import { useQuery } from "@tanstack/react-query";
import useFetch from "@/hooks/useFetch";
import type { User } from "@/types/user";

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
