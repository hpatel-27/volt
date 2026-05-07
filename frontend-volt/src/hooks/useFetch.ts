import { useAuth } from "@clerk/clerk-react";
import { FetchError } from "../lib/errors";

export default function useFetch() {
  // Use `useAuth()` to access the `getToken()` method
  const { getToken } = useAuth();

  // Make an authenticated fetch function with generic return type
  // The generic type T represents the expected return type of the fetch.
  // Ex. Call it with a specific type: authenticatedFetch<Weight[]>("/api/v1/weights") or unknown
  const authenticatedFetch = async <T = unknown>(
    input: string | URL,
    init?: RequestInit,
  ): Promise<T | null> => {
    // Use `getToken()` to get the current session token
    const token = await getToken();

    const res = await fetch(input, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${token}` }, // Include the session token as a Bearer token in the Authorization header
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const detail = body?.error || res.statusText;
      const requestId = body?.requestId ?? null;
      throw new FetchError(res.status, detail, requestId);
    }

    // Handle the success case with no content (204 No Content)
    if (res.status === 204) {
      return null;
    }

    // Handle the success case with a JSON body
    if (res.headers.get("content-type")?.includes("application/json")) {
      return await res.json();
    }
    // If the content type isn't JSON, throw an error since we don't know how to handle it
    throw new Error(
      `Unexpected response content type: ${res.headers.get("content-type")}`,
    );
  };

  return authenticatedFetch;
}
