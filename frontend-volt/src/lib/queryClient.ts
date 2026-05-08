import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FetchError, getUserFacingMessage } from "./errors";

const handleError = (error: unknown) => toast.error(getUserFacingMessage(error));

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
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
