import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useFetch from "../hooks/useFetch";
import type {
  CreateWeightInput,
  UpdateWeightVariables,
  DeleteWeightVariables,
  Weight,
  WeightsPage,
} from "../types/weight";

const BASE = `${import.meta.env.VITE_API_BASE_URL}/weights`;

/**
 * Query key factory for the weights resource.
 *
 * ## What query keys are
 * A query key is an array TanStack Query hashes to use as a cache ID.
 * Two queries with the same key share one cache entry; different keys =
 * different entries. Keys are also how mutations target which cached
 * data to invalidate after a write.
 *
 * ## Why a factory (vs hardcoded literals)
 * - Single source of truth: rename or restructure in one place.
 * - Type safety: typos become compile errors instead of silent cache misses.
 * - Discoverability: autocomplete shows every key shape this resource uses.
 * - Documentation: this object IS the map of how the weights cache is organized.
 *
 * ## Prefix invalidation (the whole reason for the hierarchy)
 * TanStack Query matches keys by array prefix. The levels below are designed
 * so each is a prefix of the next, letting mutations invalidate at the
 * narrowest correct scope:
 *
 *   all       → ["weights"]
 *   lists()   → ["weights", "list"]
 *   list(p)   → ["weights", "list", { page, limit }]
 *   details() → ["weights", "detail"]
 *   detail(id)→ ["weights", "detail", id]
 *   latest()  → ["weights", "latest"]
 *
 *   invalidateQueries({ queryKey: weightKeys.all })     → every weights query
 *   invalidateQueries({ queryKey: weightKeys.lists() }) → every list (any page/limit), leaves details alone
 *   invalidateQueries({ queryKey: weightKeys.list(p) }) → only that specific page+limit
 *   invalidateQueries({ queryKey: weightKeys.detail(5) }) → only weight #5's detail
 *   invalidateQueries({ queryKey: weightKeys.latest() }) → only latest weight
 *
 * ## How to choose a level when invalidating
 * Pick the narrowest level that covers every cache entry the write affects.
 * - Create  → invalidate `lists()` (a new row appears in lists; details unaffected).
 * - Update  → invalidate `lists()` AND `detail(id)`.
 * - Delete  → invalidate `lists()` AND remove/invalidate `detail(id)`.
 *
 * ## `as const`
 * Each tuple uses `as const` so TypeScript keeps the literal types
 * (`readonly ["weights", "list"]` instead of `string[]`). This preserves
 * key-shape information through to useQuery's generics.
 */
export const weightKeys = {
  all: ["weights"] as const,
  lists: () => [...weightKeys.all, "list"] as const,
  list: (params: { page: number; limit: number }) =>
    [...weightKeys.lists(), params] as const,
  details: () => [...weightKeys.all, "detail"] as const,
  detail: (id: number) => [...weightKeys.details(), id] as const,
  latest: () => [...weightKeys.all, "latest"] as const,
};

export function useLatestWeight() {
  const FIRST_PAGE = 1;
  const FIRST_ENTRY = 1;

  const authedFetch = useFetch();
  return useQuery({
    queryKey: weightKeys.latest(),
    queryFn: async () => {
      const url = `${BASE}?page=${FIRST_PAGE}&limit=${FIRST_ENTRY}`;
      const data = await authedFetch<WeightsPage>(url);
      if (!data) throw new Error("Expected latest weight, got empty response");
      return data;
    },
    select: (data) => data.weights[0],
  });
}

export function useWeights(params: { page: number; limit: number }) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: weightKeys.list(params),
    queryFn: async () => {
      const url = `${BASE}?page=${params.page}&limit=${params.limit}`;
      const data = await authedFetch<WeightsPage>(url);
      if (!data) throw new Error("Expected weights page, got empty response");
      return data;
    },
  });
}

export function useWeightDetail(id: number) {
  const authedFetch = useFetch();
  return useQuery({
    queryKey: weightKeys.detail(id),
    queryFn: async () => {
      const url = `${BASE}/${id}`;
      const data = await authedFetch<Weight>(url);
      if (!data) throw new Error("Expected weight detail, got empty response");
      return data;
    },
  });
}

export function useCreateWeight() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWeightInput) => {
      const data = await authedFetch<Weight>(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data) throw new Error("Expected created weight, got empty response");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightKeys.lists() });
      queryClient.invalidateQueries({ queryKey: weightKeys.latest() });
    },
  });
}

export function useUpdateWeight() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: UpdateWeightVariables) => {
      const url = `${BASE}/${id}`;
      const data = await authedFetch<Weight>(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!data) throw new Error("Expected updated weight, got empty response");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: weightKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: weightKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: weightKeys.latest() });
    },
  });
}

export function useDeleteWeight() {
  const authedFetch = useFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteWeightVariables) => {
      const url = `${BASE}/${id}`;
      await authedFetch(url, { method: "DELETE" });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: weightKeys.lists() });
      queryClient.removeQueries({ queryKey: weightKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: weightKeys.latest() });
    },
  });
}
