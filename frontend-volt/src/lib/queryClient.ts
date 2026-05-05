import { QueryClient } from "@tanstack/react-query";
import { FetchError } from "./errors";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: (failureCount, error) => {
        if (failureCount >= 2) {
          return false;
        }
        if (
          error instanceof FetchError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          return false;
        }
        return true;
      },
    },
  },
});

export { queryClient };
