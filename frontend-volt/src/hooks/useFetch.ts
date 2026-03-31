import { useAuth } from "@clerk/clerk-react";

export default function useFetch() {
  // Use `useAuth()` to access the `getToken()` method
  const { getToken } = useAuth();

  const authenticatedFetch = async (...args) => {
    // Use `getToken()` to get the current session token
    const token = await getToken();

    return fetch(...args, {
      headers: { Authorization: `Bearer ${token}` }, // Include the session token as a Bearer token in the Authorization header
    }).then((res) => res.json());
  };

  return authenticatedFetch;
}
